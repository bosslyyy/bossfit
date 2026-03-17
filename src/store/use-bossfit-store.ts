"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEY, STORAGE_VERSION } from "@/lib/constants";
import { toDateKey } from "@/lib/date";
import {
  bossFitPersistStorage,
  createInitialPersistedState,
  DEFAULT_CLOUD_SYNC_STATE,
  DEFAULT_REMINDER_SETTINGS,
  type BossFitPersistedState,
  migratePersistedState
} from "@/lib/persistence";
import { generateId } from "@/lib/utils";
import type { HabitFormValues } from "@/lib/validation/habit";
import type {
  CloudSyncState,
  DailyCompletion,
  Habit,
  ReminderSettings,
  ThemeMode
} from "@/types/habit";

interface CompletionResult {
  completedSets: number;
  justCompleted: boolean;
}

interface BossFitState {
  habits: Habit[];
  completions: DailyCompletion[];
  theme: ThemeMode;
  reminderSettings: ReminderSettings;
  cloudSync: CloudSyncState;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addHabit: (values: HabitFormValues) => string;
  updateHabit: (habitId: string, values: HabitFormValues) => void;
  deleteHabit: (habitId: string) => void;
  toggleHabitActive: (habitId: string) => void;
  completeSet: (habitId: string, dateKey?: string) => CompletionResult | null;
  undoSet: (habitId: string, dateKey?: string) => number | null;
  resetCompletion: (habitId: string, dateKey?: string) => void;
  setTheme: (theme: ThemeMode) => void;
  updateReminderSettings: (values: Partial<ReminderSettings>) => void;
  replacePersistedState: (values: BossFitPersistedState) => void;
  setCloudSyncState: (values: Partial<CloudSyncState>) => void;
  resetAppData: () => void;
}

function createLocalChangeCloudState(cloudSync: CloudSyncState): CloudSyncState {
  return {
    ...DEFAULT_CLOUD_SYNC_STATE,
    ...cloudSync,
    lastLocalChangeAt: new Date().toISOString()
  };
}

function upsertCompletion(
  completions: DailyCompletion[],
  nextCompletion: DailyCompletion | null
): DailyCompletion[] {
  if (!nextCompletion) {
    return completions;
  }

  const filtered = completions.filter(
    (completion) =>
      !(completion.habitId === nextCompletion.habitId && completion.date === nextCompletion.date)
  );

  if (nextCompletion.completedSets <= 0) {
    return filtered;
  }

  return [...filtered, nextCompletion];
}

function createStoreState(): Pick<
  BossFitState,
  "habits" | "completions" | "theme" | "reminderSettings" | "cloudSync" | "hasHydrated"
> {
  const initialState = createInitialPersistedState();

  return {
    ...initialState,
    hasHydrated: false
  };
}

function mergePersistedSlice(
  persistedState: unknown,
  currentState: BossFitState
): BossFitState {
  const migratedState = migratePersistedState(persistedState, STORAGE_VERSION);

  return {
    ...currentState,
    ...migratedState,
    reminderSettings: {
      ...DEFAULT_REMINDER_SETTINGS,
      ...migratedState.reminderSettings
    },
    cloudSync: {
      ...DEFAULT_CLOUD_SYNC_STATE,
      ...migratedState.cloudSync
    }
  };
}

export const useBossFitStore = create<BossFitState>()(
  persist(
    (set, get) => ({
      ...createStoreState(),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addHabit: (values) => {
        const timestamp = new Date().toISOString();
        const habitId = generateId("habit");
        const nextHabit: Habit = {
          id: habitId,
          name: values.name,
          category: values.category,
          targetSets: values.targetSets,
          repsPerSet: values.repsPerSet,
          selectedDays: values.selectedDays,
          active: values.active,
          color: values.color,
          icon: values.icon,
          level: values.level,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        set((state) => ({
          habits: [nextHabit, ...state.habits],
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        }));

        return habitId;
      },
      updateHabit: (habitId, values) => {
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === habitId
              ? {
                  ...habit,
                  name: values.name,
                  category: values.category,
                  targetSets: values.targetSets,
                  repsPerSet: values.repsPerSet,
                  selectedDays: values.selectedDays,
                  active: values.active,
                  color: values.color,
                  icon: values.icon,
                  level: values.level,
                  updatedAt: new Date().toISOString()
                }
              : habit
          ),
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        }));
      },
      deleteHabit: (habitId) => {
        set((state) => ({
          habits: state.habits.filter((habit) => habit.id !== habitId),
          completions: state.completions.filter((completion) => completion.habitId !== habitId),
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        }));
      },
      toggleHabitActive: (habitId) => {
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === habitId
              ? {
                  ...habit,
                  active: !habit.active,
                  updatedAt: new Date().toISOString()
                }
              : habit
          ),
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        }));
      },
      completeSet: (habitId, dateKey = toDateKey()) => {
        const state = get();
        const habit = state.habits.find((item) => item.id === habitId);

        if (!habit) {
          return null;
        }

        const currentCompletion =
          state.completions.find(
            (completion) => completion.habitId === habitId && completion.date === dateKey
          ) ?? null;
        const currentSets = currentCompletion?.completedSets ?? 0;
        const nextSets = Math.min(currentSets + 1, habit.targetSets);

        if (nextSets === currentSets) {
          return {
            completedSets: currentSets,
            justCompleted: currentSets === habit.targetSets
          };
        }

        const timestamp = new Date().toISOString();
        const nextCompletion: DailyCompletion = {
          habitId,
          date: dateKey,
          completedSets: nextSets,
          updatedAt: timestamp,
          completedAt: nextSets === habit.targetSets ? timestamp : undefined
        };

        set((currentState) => ({
          completions: upsertCompletion(currentState.completions, nextCompletion),
          cloudSync: createLocalChangeCloudState(currentState.cloudSync)
        }));

        return {
          completedSets: nextSets,
          justCompleted: nextSets === habit.targetSets
        };
      },
      undoSet: (habitId, dateKey = toDateKey()) => {
        const state = get();
        const habit = state.habits.find((item) => item.id === habitId);

        if (!habit) {
          return null;
        }

        const currentCompletion =
          state.completions.find(
            (completion) => completion.habitId === habitId && completion.date === dateKey
          ) ?? null;
        const currentSets = currentCompletion?.completedSets ?? 0;
        const nextSets = Math.max(currentSets - 1, 0);

        set((currentState) => ({
          completions:
            nextSets === 0
              ? currentState.completions.filter(
                  (completion) => !(completion.habitId === habitId && completion.date === dateKey)
                )
              : upsertCompletion(currentState.completions, {
                  habitId,
                  date: dateKey,
                  completedSets: nextSets,
                  updatedAt: new Date().toISOString()
                }),
          cloudSync: createLocalChangeCloudState(currentState.cloudSync)
        }));

        return nextSets;
      },
      resetCompletion: (habitId, dateKey = toDateKey()) => {
        set((state) => ({
          completions: state.completions.filter(
            (completion) => !(completion.habitId === habitId && completion.date === dateKey)
          ),
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        }));
      },
      setTheme: (theme) =>
        set((state) => ({
          theme,
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        })),
      updateReminderSettings: (values) =>
        set((state) => ({
          reminderSettings: {
            ...state.reminderSettings,
            ...values
          },
          cloudSync: createLocalChangeCloudState(state.cloudSync)
        })),
      replacePersistedState: (values) =>
        set({
          habits: values.habits,
          completions: values.completions,
          theme: values.theme,
          reminderSettings: {
            ...DEFAULT_REMINDER_SETTINGS,
            ...values.reminderSettings
          },
          cloudSync: {
            ...DEFAULT_CLOUD_SYNC_STATE,
            ...values.cloudSync
          },
          hasHydrated: true
        }),
      setCloudSyncState: (values) =>
        set((state) => ({
          cloudSync: {
            ...DEFAULT_CLOUD_SYNC_STATE,
            ...state.cloudSync,
            ...values
          }
        })),
      resetAppData: () => {
        const freshState = createInitialPersistedState();
        set({
          ...freshState,
          theme: get().theme,
          reminderSettings: get().reminderSettings,
          cloudSync: createLocalChangeCloudState(get().cloudSync),
          hasHydrated: true
        });
      }
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: bossFitPersistStorage,
      partialize: (state): BossFitPersistedState => ({
        habits: state.habits,
        completions: state.completions,
        theme: state.theme,
        reminderSettings: state.reminderSettings,
        cloudSync: state.cloudSync
      }),
      migrate: (persistedState, version) => migratePersistedState(persistedState, version),
      merge: (persistedState, currentState) => mergePersistedSlice(persistedState, currentState),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
