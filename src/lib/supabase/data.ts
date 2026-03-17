import { STORAGE_VERSION } from "@/lib/constants";
import {
  createInitialPersistedState,
  DEFAULT_REMINDER_SETTINGS,
  migratePersistedState,
  type BossFitPersistedState
} from "@/lib/persistence";
import { getBossProfile } from "@/lib/progress-analytics";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReminderSettings, ThemeMode } from "@/types/habit";

const USER_STATE_TABLE = "bossfit_user_state";
const DEFAULT_LEVEL = 1;

export interface BossFitRemoteSnapshot {
  habits: BossFitPersistedState["habits"];
  completions: BossFitPersistedState["completions"];
  theme: ThemeMode;
  reminderSettings: ReminderSettings;
}

export interface BossFitRemoteMetrics {
  habitsCount: number;
  completionsCount: number;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
}

interface BossFitRemoteRow {
  user_id: string;
  storage_version: number;
  app_state: unknown;
  last_synced_at: string | null;
  updated_at: string | null;
  habits_count: number | null;
  completions_count: number | null;
  current_streak: number | null;
  best_streak: number | null;
  total_points: number | null;
  level: number | null;
}

export interface BossFitRemoteState extends BossFitRemoteMetrics {
  snapshot: BossFitRemoteSnapshot;
  storageVersion: number;
  lastSyncedAt?: string;
  updatedAt?: string;
}

export interface SupabaseErrorInfo {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeErrorField(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getSupabaseErrorInfo(error: unknown): SupabaseErrorInfo {
  if (error instanceof Error && !isRecord(error)) {
    return {
      message: error.message,
      details: null,
      hint: null,
      code: null
    };
  }

  if (isRecord(error)) {
    return {
      message:
        typeof error.message === "string"
          ? error.message
          : error instanceof Error
            ? error.message
            : "Error desconocido de Supabase.",
      details: normalizeErrorField(error.details),
      hint: normalizeErrorField(error.hint),
      code: normalizeErrorField(error.code)
    };
  }

  return {
    message: error instanceof Error ? error.message : "Error desconocido de Supabase.",
    details: null,
    hint: null,
    code: null
  };
}

export function logSupabaseError(context: string, error: unknown) {
  const info = getSupabaseErrorInfo(error);
  console.error(context, {
    message: info.message,
    details: info.details,
    hint: info.hint,
    code: info.code,
    raw: error
  });
}

export function toRemoteSnapshot(
  value:
    | Pick<BossFitPersistedState, "habits" | "completions" | "theme" | "reminderSettings">
    | BossFitPersistedState
): BossFitRemoteSnapshot {
  const migrated = migratePersistedState(value, STORAGE_VERSION);
  return {
    habits: migrated.habits,
    completions: migrated.completions,
    theme: migrated.theme,
    reminderSettings: migrated.reminderSettings
  };
}

export function createEmptyRemoteSnapshot(): BossFitRemoteSnapshot {
  return toRemoteSnapshot(createInitialPersistedState());
}

export function hasMeaningfulSnapshotData(snapshot: BossFitRemoteSnapshot) {
  return (
    snapshot.habits.length > 0 ||
    snapshot.completions.length > 0 ||
    snapshot.theme !== "light" ||
    snapshot.reminderSettings.enabled ||
    snapshot.reminderSettings.time !== DEFAULT_REMINDER_SETTINGS.time ||
    snapshot.reminderSettings.permission !== DEFAULT_REMINDER_SETTINGS.permission ||
    Boolean(snapshot.reminderSettings.lastSentDate)
  );
}

function buildRemoteMetrics(snapshot: BossFitRemoteSnapshot): BossFitRemoteMetrics {
  const bossProfile = getBossProfile(snapshot.habits, snapshot.completions, new Date());

  return {
    habitsCount: snapshot.habits.length,
    completionsCount: snapshot.completions.length,
    currentStreak: bossProfile.currentStreak,
    bestStreak: bossProfile.bestStreak,
    totalPoints: bossProfile.totalPoints,
    level: bossProfile.levelProgress.level || DEFAULT_LEVEL
  };
}

function normalizeRemoteMetrics(
  row: Partial<BossFitRemoteRow>,
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

function buildRemotePayload(userId: string, snapshot: BossFitRemoteSnapshot, syncedAt: string) {
  const metrics = buildRemoteMetrics(snapshot);

  return {
    user_id: userId,
    storage_version: STORAGE_VERSION,
    app_state: toRemoteSnapshot(snapshot),
    last_synced_at: syncedAt,
    habits_count: metrics.habitsCount,
    completions_count: metrics.completionsCount,
    current_streak: metrics.currentStreak,
    best_streak: metrics.bestStreak,
    total_points: metrics.totalPoints,
    level: metrics.level
  };
}

export async function fetchRemoteState(userId: string): Promise<BossFitRemoteState | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase
    .from(USER_STATE_TABLE)
    .select(
      "user_id, storage_version, app_state, last_synced_at, updated_at, habits_count, completions_count, current_streak, best_streak, total_points, level"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as BossFitRemoteRow;
  const migrated = migratePersistedState(row.app_state, row.storage_version);
  const snapshot = toRemoteSnapshot(migrated);
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    snapshot,
    storageVersion: typeof row.storage_version === "number" ? row.storage_version : 0,
    lastSyncedAt: row.last_synced_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    ...metrics
  };
}

export async function saveRemoteState(userId: string, snapshot: BossFitRemoteSnapshot) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const syncedAt = new Date().toISOString();
  const payload = buildRemotePayload(userId, snapshot, syncedAt);

  const { data, error } = await supabase
    .from(USER_STATE_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select(
      "last_synced_at, updated_at, habits_count, completions_count, current_streak, best_streak, total_points, level"
    )
    .single();

  if (error) {
    throw error;
  }

  const row = (data ?? {}) as Partial<BossFitRemoteRow>;
  const metrics = normalizeRemoteMetrics(row, snapshot);

  return {
    lastSyncedAt: row.last_synced_at ?? syncedAt,
    updatedAt: row.updated_at ?? row.last_synced_at ?? syncedAt,
    ...metrics
  };
}
