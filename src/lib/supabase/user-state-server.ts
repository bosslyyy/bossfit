import type { SupabaseClient } from "@supabase/supabase-js";

import { STORAGE_VERSION } from "@/lib/constants";
import {
  buildRemoteMetrics,
  createEmptyRemoteSnapshot,
  getSupabaseErrorInfo,
  hasMeaningfulSnapshotData,
  normalizeSaveReason,
  toRemoteSnapshot,
  type BossFitRemoteMetrics,
  type BossFitRemoteSnapshot,
  type BossFitRemoteState,
  type SaveRemoteStateOptions
} from "@/lib/supabase/data";

const USER_STATE_TABLE = "bossfit_user_state";
const USER_STATE_HISTORY_TABLE = "bossfit_user_state_history";
const HISTORY_LOOKBACK_LIMIT = 12;

interface BossFitRemoteRow {
  user_id: string;
  storage_version: number;
  app_state: unknown;
  last_synced_at: string | null;
  updated_at: string | null;
  last_save_reason?: string | null;
  habits_count: number | null;
  completions_count: number | null;
  current_streak: number | null;
  best_streak: number | null;
  total_points: number | null;
  level: number | null;
}

interface BossFitRemoteHistoryRow {
  user_id: string;
  storage_version: number;
  app_state: unknown;
  saved_at: string | null;
  saved_reason: string | null;
  habits_count: number | null;
  completions_count: number | null;
  current_streak: number | null;
  best_streak: number | null;
  total_points: number | null;
  level: number | null;
}

function isMissingHistoryError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return source.includes("42p01") || source.includes("pgrst205") || source.includes(USER_STATE_HISTORY_TABLE);
}

function isCurrentStateSchemaFallbackError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return source.includes("42703") || source.includes("pgrst204") || source.includes("last_save_reason");
}

function normalizeRemoteMetrics(
  row: Partial<BossFitRemoteRow | BossFitRemoteHistoryRow>,
  snapshot: BossFitRemoteSnapshot
): BossFitRemoteMetrics {
  const fallback = buildRemoteMetrics(snapshot);

  return {
    habitsCount: row.habits_count ?? fallback.habitsCount,
    completionsCount: row.completions_count ?? fallback.completionsCount,
    currentStreak: row.current_streak ?? fallback.currentStreak,
    bestStreak: row.best_streak ?? fallback.bestStreak,
    totalPoints: row.total_points ?? fallback.totalPoints,
    level: row.level ?? fallback.level
  };
}

function buildRemotePayload(
  userId: string,
  snapshot: BossFitRemoteSnapshot,
  syncedAt: string,
  reason: NonNullable<SaveRemoteStateOptions["reason"]>
) {
  const metrics = buildRemoteMetrics(snapshot);

  return {
    user_id: userId,
    storage_version: STORAGE_VERSION,
    app_state: toRemoteSnapshot(snapshot),
    last_synced_at: syncedAt,
    last_save_reason: reason,
    habits_count: metrics.habitsCount,
    completions_count: metrics.completionsCount,
    current_streak: metrics.currentStreak,
    best_streak: metrics.bestStreak,
    total_points: metrics.totalPoints,
    level: metrics.level
  };
}

function toRemoteStateFromCurrentRow(row: BossFitRemoteRow): BossFitRemoteState {
  const snapshot = toRemoteSnapshot(row.app_state as BossFitRemoteSnapshot);
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    snapshot,
    storageVersion: typeof row.storage_version === "number" ? row.storage_version : STORAGE_VERSION,
    lastSyncedAt: row.last_synced_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    lastSaveReason: normalizeSaveReason(row.last_save_reason),
    source: "current",
    ...metrics
  };
}

function toRemoteStateFromHistoryRow(row: BossFitRemoteHistoryRow): BossFitRemoteState {
  const snapshot = toRemoteSnapshot(row.app_state as BossFitRemoteSnapshot);
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    snapshot,
    storageVersion: typeof row.storage_version === "number" ? row.storage_version : STORAGE_VERSION,
    lastSyncedAt: row.saved_at ?? undefined,
    updatedAt: row.saved_at ?? undefined,
    lastSaveReason: normalizeSaveReason(row.saved_reason),
    source: "history",
    ...metrics
  };
}

function shouldRecoverFromHistory(
  currentState: BossFitRemoteState | null,
  historyState: BossFitRemoteState | null
) {
  if (!historyState || !hasMeaningfulSnapshotData(historyState.snapshot)) {
    return false;
  }

  // Never auto-restore over an existing current snapshot. An empty current state can be
  // intentional (for example, the user deleted the last habit) and reviving history would
  // bring deleted data back after a reload. History remains available as a fallback only
  // when the current row is actually missing.
  return currentState === null;
}

export async function fetchUserRemoteStateWithClient(
  supabase: SupabaseClient,
  userId: string
): Promise<BossFitRemoteState | null> {
  const modernSelect =
    "user_id, storage_version, app_state, last_synced_at, updated_at, last_save_reason, habits_count, completions_count, current_streak, best_streak, total_points, level";
  const legacySelect =
    "user_id, storage_version, app_state, last_synced_at, updated_at, habits_count, completions_count, current_streak, best_streak, total_points, level";

  let { data, error } = await supabase
    .from(USER_STATE_TABLE)
    .select(modernSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && isCurrentStateSchemaFallbackError(error)) {
    ({ data, error } = await supabase
      .from(USER_STATE_TABLE)
      .select(legacySelect)
      .eq("user_id", userId)
      .maybeSingle());
  }

  if (error) {
    throw error;
  }

  const currentState = data ? toRemoteStateFromCurrentRow(data as BossFitRemoteRow) : null;

  let historyState: BossFitRemoteState | null = null;
  const historyResult = await supabase
    .from(USER_STATE_HISTORY_TABLE)
    .select(
      "user_id, storage_version, app_state, saved_at, saved_reason, habits_count, completions_count, current_streak, best_streak, total_points, level"
    )
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(HISTORY_LOOKBACK_LIMIT);

  if (historyResult.error) {
    if (!isMissingHistoryError(historyResult.error)) {
      throw historyResult.error;
    }
  } else {
    for (const row of (historyResult.data ?? []) as BossFitRemoteHistoryRow[]) {
      const candidate = toRemoteStateFromHistoryRow(row);
      if (hasMeaningfulSnapshotData(candidate.snapshot)) {
        historyState = candidate;
        break;
      }
    }
  }

  if (shouldRecoverFromHistory(currentState, historyState)) {
    return historyState;
  }

  return currentState ?? historyState ?? null;
}

export async function saveUserRemoteStateWithClient(
  supabase: SupabaseClient,
  userId: string,
  snapshot: BossFitRemoteSnapshot,
  options: SaveRemoteStateOptions = {}
) {
  const reason = options.reason ?? "sync";
  const syncedAt = new Date().toISOString();
  const modernPayload = buildRemotePayload(userId, snapshot, syncedAt, reason);
  const legacyPayload = { ...modernPayload } as Record<string, unknown>;
  delete legacyPayload.last_save_reason;
  const modernSelect =
    "last_synced_at, updated_at, last_save_reason, habits_count, completions_count, current_streak, best_streak, total_points, level";
  const legacySelect =
    "last_synced_at, updated_at, habits_count, completions_count, current_streak, best_streak, total_points, level";

  let result = await supabase
    .from(USER_STATE_TABLE)
    .upsert(modernPayload, { onConflict: "user_id" })
    .select(modernSelect)
    .single();

  if (result.error && isCurrentStateSchemaFallbackError(result.error)) {
    result = await supabase
      .from(USER_STATE_TABLE)
      .upsert(legacyPayload, { onConflict: "user_id" })
      .select(legacySelect)
      .single();
  }

  if (result.error) {
    throw result.error;
  }

  const row = (result.data ?? {}) as Partial<BossFitRemoteRow>;
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    lastSyncedAt: row.last_synced_at ?? syncedAt,
    updatedAt: row.updated_at ?? row.last_synced_at ?? syncedAt,
    lastSaveReason: normalizeSaveReason(row.last_save_reason) ?? reason,
    ...metrics
  };
}

export async function fetchUserRemoteStateOrEmpty(
  supabase: SupabaseClient,
  userId: string
): Promise<BossFitRemoteState> {
  const state = await fetchUserRemoteStateWithClient(supabase, userId);

  if (state) {
    return state;
  }

  const snapshot = createEmptyRemoteSnapshot();
  return {
    snapshot,
    storageVersion: STORAGE_VERSION,
    source: "current",
    ...buildRemoteMetrics(snapshot)
  };
}
