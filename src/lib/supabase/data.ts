import { STORAGE_VERSION } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createInitialPersistedState,
  DEFAULT_REMINDER_SETTINGS,
  migratePersistedState,
  type BossFitPersistedState
} from "@/lib/persistence";
import { getBossProfile } from "@/lib/progress-analytics";
import type { ReminderSettings, RemoteSaveReason, ThemeMode } from "@/types/habit";

const DEFAULT_LEVEL = 1;

export const REMOTE_STATE_CONFLICT_CODE = "BOSSFIT_REMOTE_REVISION_CONFLICT";

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

export interface BossFitRemoteState extends BossFitRemoteMetrics {
  snapshot: BossFitRemoteSnapshot;
  storageVersion: number;
  revision: number;
  lastSyncedAt?: string;
  updatedAt?: string;
  lastSaveReason?: RemoteSaveReason;
  source: "current" | "history";
}

export interface SaveRemoteStateOptions {
  reason?: RemoteSaveReason;
  expectedRevision?: number;
}

export interface SupabaseErrorInfo {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
}

export interface RemoteStateConflictError extends SupabaseErrorInfo {
  code: typeof REMOTE_STATE_CONFLICT_CODE;
  state: BossFitRemoteState | null;
}

export interface SaveRemoteStateResult extends BossFitRemoteMetrics {
  lastSyncedAt: string;
  updatedAt: string;
  lastSaveReason?: RemoteSaveReason;
  revision: number;
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
          : typeof error.error === "string"
            ? error.error
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

export function isRemoteStateConflictError(error: unknown): error is RemoteStateConflictError {
  return isRecord(error) && error.code === REMOTE_STATE_CONFLICT_CODE;
}

export function normalizeSaveReason(value: unknown): RemoteSaveReason | undefined {
  switch (value) {
    case "sync":
    case "reset":
    case "signout":
    case "pagehide":
    case "bootstrap":
    case "recovery":
      return value;
    default:
      return undefined;
  }
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

export function buildRemoteMetrics(snapshot: BossFitRemoteSnapshot): BossFitRemoteMetrics {
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

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("No hay una sesion activa para sincronizar tu cuenta.");
  }

  return accessToken;
}

async function requestUserStateApi<T>(init: RequestInit & { method?: string }) {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user-state", {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw {
      message: typeof payload.error === "string" ? payload.error : "No se pudo sincronizar con Supabase.",
      details: payload.details ?? null,
      hint: payload.hint ?? null,
      code: typeof payload.code === "string" ? payload.code : null,
      state: isRecord(payload.state) ? (payload.state as unknown as BossFitRemoteState) : null
    };
  }

  return payload as T;
}

export async function fetchRemoteState(_userId: string): Promise<BossFitRemoteState | null> {
  const payload = await requestUserStateApi<{ state?: BossFitRemoteState | null }>({
    method: "GET"
  });

  return payload.state ?? null;
}

export async function saveRemoteState(
  _userId: string,
  snapshot: BossFitRemoteSnapshot,
  options: SaveRemoteStateOptions = {}
): Promise<SaveRemoteStateResult> {
  const payload = await requestUserStateApi<{ saved: SaveRemoteStateResult }>({
    method: "POST",
    body: JSON.stringify({
      snapshot,
      reason: options.reason ?? "sync",
      expectedRevision: options.expectedRevision ?? null
    })
  });

  return payload.saved;
}



