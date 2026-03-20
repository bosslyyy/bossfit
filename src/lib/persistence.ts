import { z } from "zod";
import type { PersistStorage, StorageValue } from "zustand/middleware";

import { STORAGE_VERSION } from "@/lib/constants";
import type {
  CloudSyncState,
  DailyCompletion,
  Habit,
  ReminderSettings,
  ThemeMode
} from "@/types/habit";

const corruptBackupSuffix = ":corrupt-backup";
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const weekdayKeySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const habitCategorySchema = z.enum([
  "fuerza",
  "cardio",
  "movilidad",
  "abdomen",
  "piernas",
  "recuperacion"
]);
const habitLevelSchema = z.enum(["principiante", "intermedio", "avanzado"]);
const habitColorSchema = z.enum(["ember", "emerald", "ocean", "sun", "rose", "graphite"]);
const habitIconSchema = z.enum(["flame", "dumbbell", "heart", "mountain", "bolt", "timer"]);
const habitTrackingModeSchema = z.enum(["reps", "timer"]);
const themeSchema = z.enum(["light", "dark"]);
const reminderPermissionSchema = z.enum(["default", "granted", "denied", "unsupported"]);
const remoteSaveReasonSchema = z.enum(["sync", "reset", "signout", "pagehide", "bootstrap", "recovery"]);

const habitSchema: z.ZodType<Habit, z.ZodTypeDef, unknown> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: habitCategorySchema.optional(),
    trackingMode: habitTrackingModeSchema.optional(),
    targetSets: z.number().int().min(1).max(999),
    repsPerSet: z.number().int().min(1).max(9999).optional(),
    secondsPerSet: z.number().int().min(5).max(7200).optional(),
    selectedDays: z.array(weekdayKeySchema).min(1),
    active: z.boolean(),
    color: habitColorSchema,
    icon: habitIconSchema,
    level: habitLevelSchema.optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
  .transform((habit): Habit => {
    const trackingMode = habit.trackingMode === "timer" ? "timer" : "reps";

    return {
      id: habit.id,
      name: habit.name,
      category: habit.category,
      trackingMode,
      targetSets: habit.targetSets,
      repsPerSet: trackingMode === "reps" ? habit.repsPerSet ?? 1 : habit.repsPerSet ?? 1,
      secondsPerSet: trackingMode === "timer" ? habit.secondsPerSet ?? 60 : undefined,
      selectedDays: habit.selectedDays,
      active: habit.active,
      color: habit.color,
      icon: habit.icon,
      level: habit.level,
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt
    };
  });

const dailyCompletionSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(dateKeyPattern),
  completedSets: z.number().int().min(0).max(999),
  updatedAt: z.string().min(1),
  completedAt: z.string().min(1).optional()
});

const reminderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  time: z.string().regex(timePattern).optional(),
  permission: reminderPermissionSchema.optional(),
  lastSentDate: z.string().regex(dateKeyPattern).optional()
});

const cloudSyncSchema = z.object({
  userId: z.string().min(1).optional(),
  lastLocalChangeAt: z.string().min(1).optional(),
  lastSyncedAt: z.string().min(1).optional(),
  pendingRemoteReason: remoteSaveReasonSchema.optional()
});

export interface BossFitPersistedState {
  habits: Habit[];
  completions: DailyCompletion[];
  theme: ThemeMode;
  reminderSettings: ReminderSettings;
  cloudSync: CloudSyncState;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: "19:00",
  permission: "default"
};

export const DEFAULT_CLOUD_SYNC_STATE: CloudSyncState = {};

export function createInitialPersistedState(): BossFitPersistedState {
  return {
    habits: [],
    completions: [],
    theme: "light",
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
    cloudSync: { ...DEFAULT_CLOUD_SYNC_STATE }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCollection<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function normalizeReminderSettings(value: unknown): ReminderSettings {
  const parsed = reminderSettingsSchema.safeParse(value);
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(parsed.success ? parsed.data : {})
  };
}

function normalizeTheme(value: unknown): ThemeMode {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : "light";
}

function normalizeCloudSync(value: unknown): CloudSyncState {
  const parsed = cloudSyncSchema.safeParse(value);
  return {
    ...DEFAULT_CLOUD_SYNC_STATE,
    ...(parsed.success ? parsed.data : {})
  };
}

export function migratePersistedState(
  persistedState: unknown,
  version = 0
): BossFitPersistedState {
  const candidate = isRecord(persistedState) ? persistedState : {};
  const baseState: BossFitPersistedState = {
    habits: parseCollection<Habit>(habitSchema, candidate.habits),
    completions: parseCollection(dailyCompletionSchema, candidate.completions),
    theme: normalizeTheme(candidate.theme),
    reminderSettings: normalizeReminderSettings(candidate.reminderSettings),
    cloudSync: normalizeCloudSync(candidate.cloudSync)
  };

  switch (version) {
    case 0:
    case 1:
    case 2:
    case 3:
    default:
      return {
        ...createInitialPersistedState(),
        ...baseState,
        reminderSettings: {
          ...DEFAULT_REMINDER_SETTINGS,
          ...baseState.reminderSettings
        },
        cloudSync: {
          ...DEFAULT_CLOUD_SYNC_STATE,
          ...baseState.cloudSync
        }
      };
  }
}

function getSafeLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function backupCorruptStorage(name: string, rawValue: string) {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`${name}${corruptBackupSuffix}`, rawValue);
  } catch {
    // Ignore backup failures and keep recovery best-effort.
  }

  try {
    storage.removeItem(name);
  } catch {
    // Ignore cleanup failures so the app can still continue.
  }
}

export const bossFitPersistStorage: PersistStorage<BossFitPersistedState> = {
  getItem: (name) => {
    const storage = getSafeLocalStorage();
    if (!storage) {
      return null;
    }

    const rawValue = storage.getItem(name);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;

      if (isRecord(parsed) && "state" in parsed) {
        return {
          state: (parsed as StorageValue<BossFitPersistedState>).state,
          version: typeof parsed.version === "number" ? parsed.version : 0
        };
      }

      return {
        state: parsed as BossFitPersistedState,
        version: 0
      };
    } catch {
      backupCorruptStorage(name, rawValue);
      return null;
    }
  },
  setItem: (name, value) => {
    const storage = getSafeLocalStorage();
    if (!storage) {
      return;
    }

    const sanitizedValue: StorageValue<BossFitPersistedState> = {
      state: migratePersistedState(value.state, STORAGE_VERSION),
      version: STORAGE_VERSION
    };

    try {
      storage.setItem(name, JSON.stringify(sanitizedValue));
    } catch {
      // Ignore write failures so the in-memory app state remains usable.
    }
  },
  removeItem: (name) => {
    const storage = getSafeLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(name);
    } catch {
      // Ignore remove failures.
    }
  }
};
