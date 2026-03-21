import type { SupabaseClient } from "@supabase/supabase-js";

import { STORAGE_VERSION } from "@/lib/constants";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/persistence";
import {
  REMOTE_STATE_CONFLICT_CODE,
  buildRemoteMetrics,
  createEmptyRemoteSnapshot,
  getSupabaseErrorInfo,
  hasMeaningfulSnapshotData,
  normalizeSaveReason,
  toRemoteSnapshot,
  type BossFitRemoteMetrics,
  type BossFitRemoteSnapshot,
  type BossFitRemoteState,
  type SaveRemoteStateOptions,
  type SaveRemoteStateResult
} from "@/lib/supabase/data";
import type { Habit, ReminderSettings } from "@/types/habit";

const USER_STATE_TABLE = "bossfit_user_state";
const USER_STATE_HISTORY_TABLE = "bossfit_user_state_history";
const USER_SETTINGS_TABLE = "bossfit_user_settings";
const USER_HABITS_TABLE = "bossfit_habits";
const USER_COMPLETIONS_TABLE = "bossfit_habit_completions";
const HISTORY_LOOKBACK_LIMIT = 12;

interface BossFitRemoteRow {
  user_id: string;
  storage_version: number;
  revision?: number | null;
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
  state_revision?: number | null;
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

interface BossFitUserSettingsRow {
  user_id: string;
  theme: BossFitRemoteSnapshot["theme"];
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_permission: ReminderSettings["permission"];
  reminder_last_sent_date: string | null;
  updated_at: string | null;
}

interface BossFitHabitRow {
  user_id: string;
  habit_id: string;
  name: string;
  category: Habit["category"] | null;
  tracking_mode: Habit["trackingMode"];
  target_sets: number;
  reps_per_set: number;
  seconds_per_set: number | null;
  rest_enabled: boolean;
  rest_seconds: number | null;
  selected_days: string[] | null;
  is_active: boolean;
  color: Habit["color"];
  icon: Habit["icon"];
  level: Habit["level"] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface BossFitCompletionRow {
  user_id: string;
  habit_id: string;
  date_key: string;
  completed_sets: number;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

interface NormalizedStateRows {
  settingsRow: BossFitUserSettingsRow | null;
  habitsRows: BossFitHabitRow[];
  completionsRows: BossFitCompletionRow[];
}

export class RemoteStateConflictError extends Error {
  readonly code = REMOTE_STATE_CONFLICT_CODE;
  readonly state: BossFitRemoteState | null;

  constructor(state: BossFitRemoteState | null) {
    super("Tu cuenta cambió en otro lugar antes de terminar esta sincronización.");
    this.name = "RemoteStateConflictError";
    this.state = state;
  }
}

function isMissingHistoryError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return source.includes("42p01") || source.includes("pgrst205") || source.includes(USER_STATE_HISTORY_TABLE);
}

function isCurrentStateSchemaFallbackError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return (
    source.includes("42703") ||
    source.includes("pgrst204") ||
    source.includes("last_save_reason") ||
    source.includes("revision") ||
    source.includes("state_revision")
  );
}

function isNormalizedStateSchemaFallbackError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return (
    source.includes("42p01") ||
    source.includes("42703") ||
    source.includes("pgrst204") ||
    source.includes("pgrst205") ||
    source.includes(USER_SETTINGS_TABLE) ||
    source.includes(USER_HABITS_TABLE) ||
    source.includes(USER_COMPLETIONS_TABLE) ||
    source.includes("date_key") ||
    source.includes("archived_at") ||
    source.includes("deleted_at") ||
    source.includes("rest_enabled") ||
    source.includes("rest_seconds")
  );
}

function isInsertConflictError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""}`.toLowerCase();
  return source.includes("23505") || source.includes("duplicate key") || source.includes("unique constraint");
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
    revision: typeof row.revision === "number" ? row.revision : 0,
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
    revision: typeof row.state_revision === "number" ? row.state_revision : 0,
    lastSyncedAt: row.saved_at ?? undefined,
    updatedAt: row.saved_at ?? undefined,
    lastSaveReason: normalizeSaveReason(row.saved_reason),
    source: "history",
    ...metrics
  };
}

function normalizeReminderSettings(row: BossFitUserSettingsRow | null) {
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    enabled: row?.reminder_enabled ?? DEFAULT_REMINDER_SETTINGS.enabled,
    time: row?.reminder_time ?? DEFAULT_REMINDER_SETTINGS.time,
    permission: row?.reminder_permission ?? DEFAULT_REMINDER_SETTINGS.permission,
    lastSentDate: row?.reminder_last_sent_date ?? undefined
  } satisfies ReminderSettings;
}

function toHabitFromRow(row: BossFitHabitRow): Habit {
  return {
    id: row.habit_id,
    name: row.name,
    category: row.category ?? undefined,
    trackingMode: row.tracking_mode,
    targetSets: row.target_sets,
    repsPerSet: row.reps_per_set,
    secondsPerSet: row.seconds_per_set ?? undefined,
    restEnabled: row.rest_enabled,
    restSeconds: row.rest_enabled ? row.rest_seconds ?? 60 : undefined,
    selectedDays: (row.selected_days ?? []) as Habit["selectedDays"],
    active: row.is_active,
    color: row.color,
    icon: row.icon,
    level: row.level ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildSnapshotFromNormalizedRows(rows: NormalizedStateRows): BossFitRemoteSnapshot {
  return {
    habits: rows.habitsRows.map(toHabitFromRow),
    completions: rows.completionsRows.map((row) => ({
      habitId: row.habit_id,
      date: row.date_key,
      completedSets: row.completed_sets,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined
    })),
    theme: rowToTheme(rows.settingsRow),
    reminderSettings: normalizeReminderSettings(rows.settingsRow)
  };
}

function rowToTheme(row: BossFitUserSettingsRow | null): BossFitRemoteSnapshot["theme"] {
  return row?.theme ?? "light";
}

function getLatestNormalizedTimestamp(rows: NormalizedStateRows) {
  const candidates = [
    rows.settingsRow?.updated_at,
    ...rows.habitsRows.flatMap((row) => [row.updated_at, row.created_at]),
    ...rows.completionsRows.flatMap((row) => [row.updated_at, row.completed_at])
  ].filter((value): value is string => Boolean(value));

  if (!candidates.length) {
    return undefined;
  }

  return candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

function rowsHaveNormalizedData(rows: NormalizedStateRows) {
  return Boolean(rows.settingsRow) || rows.habitsRows.length > 0 || rows.completionsRows.length > 0;
}

function toRemoteStateFromNormalizedRows(
  rows: NormalizedStateRows,
  currentRow: BossFitRemoteRow | null
): BossFitRemoteState {
  const snapshot = buildSnapshotFromNormalizedRows(rows);
  const metrics = buildRemoteMetrics(snapshot);
  const latestNormalizedTimestamp = getLatestNormalizedTimestamp(rows);

  return {
    snapshot,
    storageVersion: STORAGE_VERSION,
    revision: typeof currentRow?.revision === "number" ? currentRow.revision : 0,
    lastSyncedAt: currentRow?.last_synced_at ?? latestNormalizedTimestamp,
    updatedAt: latestNormalizedTimestamp ?? currentRow?.updated_at ?? undefined,
    lastSaveReason: normalizeSaveReason(currentRow?.last_save_reason),
    source: "current",
    ...metrics
  };
}

function toSaveResult(state: BossFitRemoteState): SaveRemoteStateResult {
  return {
    habitsCount: state.habitsCount,
    completionsCount: state.completionsCount,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    totalPoints: state.totalPoints,
    level: state.level,
    lastSyncedAt: state.lastSyncedAt ?? new Date().toISOString(),
    updatedAt: state.updatedAt ?? state.lastSyncedAt ?? new Date().toISOString(),
    lastSaveReason: state.lastSaveReason,
    revision: state.revision
  };
}

function shouldRecoverFromHistory(
  currentState: BossFitRemoteState | null,
  historyState: BossFitRemoteState | null
) {
  if (!historyState || !hasMeaningfulSnapshotData(historyState.snapshot)) {
    return false;
  }

  return currentState === null;
}

async function fetchCurrentStateRowWithFallback(supabase: SupabaseClient, userId: string) {
  const modernSelect =
    "user_id, storage_version, revision, app_state, last_synced_at, updated_at, last_save_reason, habits_count, completions_count, current_streak, best_streak, total_points, level";
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

  return data ? (data as BossFitRemoteRow) : null;
}

async function fetchMeaningfulHistoryState(supabase: SupabaseClient, userId: string) {
  const historyResult = await supabase
    .from(USER_STATE_HISTORY_TABLE)
    .select(
      "user_id, storage_version, state_revision, app_state, saved_at, saved_reason, habits_count, completions_count, current_streak, best_streak, total_points, level"
    )
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(HISTORY_LOOKBACK_LIMIT);

  if (historyResult.error) {
    if (isMissingHistoryError(historyResult.error)) {
      return null;
    }

    throw historyResult.error;
  }

  for (const row of (historyResult.data ?? []) as BossFitRemoteHistoryRow[]) {
    const candidate = toRemoteStateFromHistoryRow(row);
    if (hasMeaningfulSnapshotData(candidate.snapshot)) {
      return candidate;
    }
  }

  return null;
}

async function fetchNormalizedStateRows(
  supabase: SupabaseClient,
  userId: string
): Promise<{ available: true; rows: NormalizedStateRows } | { available: false }> {
  const [settingsResult, habitsResult, completionsResult] = await Promise.all([
    supabase
      .from(USER_SETTINGS_TABLE)
      .select("user_id, theme, reminder_enabled, reminder_time, reminder_permission, reminder_last_sent_date, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from(USER_HABITS_TABLE)
      .select(
        "user_id, habit_id, name, category, tracking_mode, target_sets, reps_per_set, seconds_per_set, selected_days, is_active, color, icon, level, created_at, updated_at, archived_at"
      )
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from(USER_COMPLETIONS_TABLE)
      .select("user_id, habit_id, date_key, completed_sets, updated_at, completed_at, deleted_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
  ]);

  const possibleErrors = [settingsResult.error, habitsResult.error, completionsResult.error].filter(Boolean);
  if (possibleErrors.length) {
    const schemaError = possibleErrors.find((error) => isNormalizedStateSchemaFallbackError(error));
    if (schemaError) {
      return { available: false };
    }

    throw possibleErrors[0];
  }

  return {
    available: true,
    rows: {
      settingsRow: (settingsResult.data as BossFitUserSettingsRow | null) ?? null,
      habitsRows: (habitsResult.data ?? []) as BossFitHabitRow[],
      completionsRows: (completionsResult.data ?? []) as BossFitCompletionRow[]
    }
  };
}

async function saveProjectionStateWithClient(
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
    "last_synced_at, updated_at, last_save_reason, habits_count, completions_count, current_streak, best_streak, total_points, level, revision";
  const legacySelect =
    "last_synced_at, updated_at, habits_count, completions_count, current_streak, best_streak, total_points, level";
  const expectedRevision = typeof options.expectedRevision === "number" ? options.expectedRevision : undefined;

  try {
    if (typeof expectedRevision === "number" && expectedRevision > 0) {
      const result = await supabase
        .from(USER_STATE_TABLE)
        .update({
          ...modernPayload,
          revision: expectedRevision + 1
        })
        .eq("user_id", userId)
        .eq("revision", expectedRevision)
        .select(modernSelect)
        .maybeSingle();

      if (result.error && isCurrentStateSchemaFallbackError(result.error)) {
        throw result.error;
      }

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        const latestState = await fetchUserRemoteStateWithClient(supabase, userId);
        throw new RemoteStateConflictError(latestState);
      }

      const row = result.data as Partial<BossFitRemoteRow>;
      const metrics = normalizeRemoteMetrics(row, snapshot);

      return {
        lastSyncedAt: row.last_synced_at ?? syncedAt,
        updatedAt: row.updated_at ?? row.last_synced_at ?? syncedAt,
        lastSaveReason: normalizeSaveReason(row.last_save_reason) ?? reason,
        revision: typeof row.revision === "number" ? row.revision : expectedRevision + 1,
        ...metrics
      } satisfies SaveRemoteStateResult;
    }

    const insertResult = await supabase
      .from(USER_STATE_TABLE)
      .insert({
        ...modernPayload,
        revision: 1
      })
      .select(modernSelect)
      .single();

    if (insertResult.error && isCurrentStateSchemaFallbackError(insertResult.error)) {
      throw insertResult.error;
    }

    if (insertResult.error) {
      if (isInsertConflictError(insertResult.error)) {
        const latestState = await fetchUserRemoteStateWithClient(supabase, userId);
        throw new RemoteStateConflictError(latestState);
      }

      throw insertResult.error;
    }

    const row = (insertResult.data ?? {}) as Partial<BossFitRemoteRow>;
    const metrics = normalizeRemoteMetrics(row, snapshot);

    return {
      lastSyncedAt: row.last_synced_at ?? syncedAt,
      updatedAt: row.updated_at ?? row.last_synced_at ?? syncedAt,
      lastSaveReason: normalizeSaveReason(row.last_save_reason) ?? reason,
      revision: typeof row.revision === "number" ? row.revision : 1,
      ...metrics
    } satisfies SaveRemoteStateResult;
  } catch (error) {
    if (!isCurrentStateSchemaFallbackError(error)) {
      throw error;
    }
  }

  const result = await supabase
    .from(USER_STATE_TABLE)
    .upsert(legacyPayload, { onConflict: "user_id" })
    .select(legacySelect)
    .single();

  if (result.error) {
    throw result.error;
  }

  const row = (result.data ?? {}) as Partial<BossFitRemoteRow>;
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    lastSyncedAt: row.last_synced_at ?? syncedAt,
    updatedAt: row.updated_at ?? row.last_synced_at ?? syncedAt,
    lastSaveReason: normalizeSaveReason(row.last_save_reason) ?? reason,
    revision: typeof expectedRevision === "number" ? expectedRevision : 0,
    ...metrics
  } satisfies SaveRemoteStateResult;
}

async function replaceNormalizedStateWithSnapshot(
  supabase: SupabaseClient,
  userId: string,
  snapshot: BossFitRemoteSnapshot
) {
  const now = new Date().toISOString();
  const normalizedSnapshot = toRemoteSnapshot(snapshot);

  try {
    const settingsPayload = {
      user_id: userId,
      theme: normalizedSnapshot.theme,
      reminder_enabled: normalizedSnapshot.reminderSettings.enabled,
      reminder_time: normalizedSnapshot.reminderSettings.time,
      reminder_permission: normalizedSnapshot.reminderSettings.permission,
      reminder_last_sent_date: normalizedSnapshot.reminderSettings.lastSentDate ?? null
    };

    const settingsResult = await supabase.from(USER_SETTINGS_TABLE).upsert(settingsPayload, { onConflict: "user_id" });
    if (settingsResult.error) {
      if (isNormalizedStateSchemaFallbackError(settingsResult.error)) {
        return false;
      }

      throw settingsResult.error;
    }

    const habitsResult = await supabase
      .from(USER_HABITS_TABLE)
      .select("habit_id")
      .eq("user_id", userId)
      .is("archived_at", null);

    if (habitsResult.error) {
      throw habitsResult.error;
    }

    const existingHabitIds = new Set((habitsResult.data ?? []).map((row) => row.habit_id as string));
    const nextHabitIds = new Set(normalizedSnapshot.habits.map((habit) => habit.id));

    if (normalizedSnapshot.habits.length) {
      const habitRows = normalizedSnapshot.habits.map((habit) => ({
        user_id: userId,
        habit_id: habit.id,
        name: habit.name,
        category: habit.category ?? null,
        tracking_mode: habit.trackingMode,
        target_sets: habit.targetSets,
        reps_per_set: habit.repsPerSet,
        seconds_per_set: habit.secondsPerSet ?? null,
        rest_enabled: habit.restEnabled,
        rest_seconds: habit.restEnabled ? habit.restSeconds ?? 60 : null,
        selected_days: habit.selectedDays,
        is_active: habit.active,
        color: habit.color,
        icon: habit.icon,
        level: habit.level ?? null,
        created_at: habit.createdAt,
        updated_at: habit.updatedAt,
        archived_at: null
      }));

      const upsertHabitsResult = await supabase
        .from(USER_HABITS_TABLE)
        .upsert(habitRows, { onConflict: "user_id,habit_id" });

      if (upsertHabitsResult.error) {
        throw upsertHabitsResult.error;
      }
    }

    const habitIdsToArchive = [...existingHabitIds].filter((habitId) => !nextHabitIds.has(habitId));
    if (habitIdsToArchive.length) {
      const archiveResult = await supabase
        .from(USER_HABITS_TABLE)
        .update({ is_active: false, updated_at: now, archived_at: now })
        .eq("user_id", userId)
        .in("habit_id", habitIdsToArchive)
        .is("archived_at", null);

      if (archiveResult.error) {
        throw archiveResult.error;
      }
    }

    const validCompletionHabitIds = new Set(normalizedSnapshot.habits.map((habit) => habit.id));
    const normalizedCompletions = normalizedSnapshot.completions.filter((completion) =>
      validCompletionHabitIds.has(completion.habitId)
    );

    const completionsResult = await supabase
      .from(USER_COMPLETIONS_TABLE)
      .select("habit_id, date_key")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (completionsResult.error) {
      throw completionsResult.error;
    }

    const existingCompletionKeys = new Set(
      (completionsResult.data ?? []).map((row) => `${row.habit_id as string}::${row.date_key as string}`)
    );
    const nextCompletionKeys = new Set(
      normalizedCompletions.map((completion) => `${completion.habitId}::${completion.date}`)
    );

    if (normalizedCompletions.length) {
      const completionRows = normalizedCompletions.map((completion) => ({
        user_id: userId,
        habit_id: completion.habitId,
        date_key: completion.date,
        completed_sets: completion.completedSets,
        updated_at: completion.updatedAt,
        completed_at: completion.completedAt ?? null,
        deleted_at: null
      }));

      const upsertCompletionsResult = await supabase
        .from(USER_COMPLETIONS_TABLE)
        .upsert(completionRows, { onConflict: "user_id,habit_id,date_key" });

      if (upsertCompletionsResult.error) {
        throw upsertCompletionsResult.error;
      }
    }

    const completionKeysToDelete = [...existingCompletionKeys].filter((key) => !nextCompletionKeys.has(key));
    for (const key of completionKeysToDelete) {
      const [habitId, dateKey] = key.split("::");
      const softDeleteResult = await supabase
        .from(USER_COMPLETIONS_TABLE)
        .update({ deleted_at: now, updated_at: now })
        .eq("user_id", userId)
        .eq("habit_id", habitId)
        .eq("date_key", dateKey)
        .is("deleted_at", null);

      if (softDeleteResult.error) {
        throw softDeleteResult.error;
      }
    }

    return true;
  } catch (error) {
    if (isNormalizedStateSchemaFallbackError(error)) {
      return false;
    }

    throw error;
  }
}

export async function fetchUserRemoteStateWithClient(
  supabase: SupabaseClient,
  userId: string
): Promise<BossFitRemoteState | null> {
  const currentRow = await fetchCurrentStateRowWithFallback(supabase, userId);
  const currentState = currentRow ? toRemoteStateFromCurrentRow(currentRow) : null;
  const normalizedResult = await fetchNormalizedStateRows(supabase, userId);

  if (normalizedResult.available) {
    const normalizedState = toRemoteStateFromNormalizedRows(normalizedResult.rows, currentRow);
    const hasNormalizedData = rowsHaveNormalizedData(normalizedResult.rows);

    if (hasNormalizedData || !currentState || !hasMeaningfulSnapshotData(currentState.snapshot)) {
      return normalizedState;
    }
  }

  const historyState = await fetchMeaningfulHistoryState(supabase, userId);

  if (normalizedResult.available) {
    const normalizedState = toRemoteStateFromNormalizedRows(normalizedResult.rows, currentRow);
    const hasNormalizedData = rowsHaveNormalizedData(normalizedResult.rows);

    if (hasNormalizedData) {
      return normalizedState;
    }

    if (currentState && hasMeaningfulSnapshotData(currentState.snapshot)) {
      return currentState;
    }

    return historyState ?? normalizedState;
  }

  if (shouldRecoverFromHistory(currentState, historyState)) {
    return historyState;
  }

  return currentState ?? historyState ?? null;
}

export async function syncUserProjectionFromNormalizedState(
  supabase: SupabaseClient,
  userId: string,
  options: SaveRemoteStateOptions & { preferredSnapshot?: BossFitRemoteSnapshot; maxAttempts?: number } = {}
): Promise<BossFitRemoteState> {
  const maxAttempts = Math.max(options.maxAttempts ?? 3, 1);
  let lastConflict: RemoteStateConflictError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const currentRow = await fetchCurrentStateRowWithFallback(supabase, userId);
    const normalizedResult = await fetchNormalizedStateRows(supabase, userId);

    const snapshot = normalizedResult.available
      ? buildSnapshotFromNormalizedRows(normalizedResult.rows)
      : options.preferredSnapshot ?? currentRow?.app_state
        ? toRemoteSnapshot((currentRow?.app_state ?? options.preferredSnapshot) as BossFitRemoteSnapshot)
        : createEmptyRemoteSnapshot();

    try {
      const saved = await saveProjectionStateWithClient(supabase, userId, snapshot, {
        reason: options.reason,
        expectedRevision: typeof currentRow?.revision === "number" ? currentRow.revision : undefined
      });

      return {
        snapshot,
        storageVersion: STORAGE_VERSION,
        revision: saved.revision,
        lastSyncedAt: saved.lastSyncedAt,
        updatedAt: saved.updatedAt,
        lastSaveReason: saved.lastSaveReason,
        source: "current",
        habitsCount: saved.habitsCount,
        completionsCount: saved.completionsCount,
        currentStreak: saved.currentStreak,
        bestStreak: saved.bestStreak,
        totalPoints: saved.totalPoints,
        level: saved.level
      } satisfies BossFitRemoteState;
    } catch (error) {
      if (error instanceof RemoteStateConflictError) {
        lastConflict = error;
        continue;
      }

      throw error;
    }
  }

  return lastConflict?.state ?? (await fetchUserRemoteStateOrEmpty(supabase, userId));
}

export async function saveUserRemoteStateWithClient(
  supabase: SupabaseClient,
  userId: string,
  snapshot: BossFitRemoteSnapshot,
  options: SaveRemoteStateOptions = {}
) {
  const currentRow = await fetchCurrentStateRowWithFallback(supabase, userId);
  const expectedRevision = typeof options.expectedRevision === "number" ? options.expectedRevision : undefined;

  if (typeof expectedRevision === "number") {
    const currentRevision = typeof currentRow?.revision === "number" ? currentRow.revision : 0;
    if (currentRevision !== expectedRevision) {
      const latestState = await fetchUserRemoteStateWithClient(supabase, userId);
      throw new RemoteStateConflictError(latestState);
    }
  }

  const normalizedSaved = await replaceNormalizedStateWithSnapshot(supabase, userId, snapshot);
  if (normalizedSaved) {
    const synced = await syncUserProjectionFromNormalizedState(supabase, userId, {
      reason: options.reason,
      preferredSnapshot: snapshot
    });

    return toSaveResult(synced);
  }

  return saveProjectionStateWithClient(supabase, userId, snapshot, options);
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
    revision: 0,
    source: "current",
    ...buildRemoteMetrics(snapshot)
  };
}



