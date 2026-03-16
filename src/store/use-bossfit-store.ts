"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { STORAGE_KEY } from "@/lib/constants";
import { toDateKey } from "@/lib/date";
import { createMockState } from "@/lib/mock-data";
import { generateId } from "@/lib/utils";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { DailyCompletion, Habit, ReminderSettings, ThemeMode } from "@/types/habit";

interface CompletionResult {
  completedSets: number;
  justCompleted: boolean;
}

interface BossFitState {
  habits: Habit[];
  completions: DailyCompletion[];
  theme: ThemeMode;
  reminderSettings: ReminderSettings;
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
  resetAppData: () => void;
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

const mockState = createMockState();
const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  time: "19:00",
  permission: "default"
};

export const useBossFitStore = create<BossFitState>()(
  persist(
    (set, get) => ({
      ...mockState,
      theme: "light",
      reminderSettings: defaultReminderSettings,
      hasHydrated: false,
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
          habits: [nextHabit, ...state.habits]
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
          )
        }));
      },
      deleteHabit: (habitId) => {
        set((state) => ({
          habits: state.habits.filter((habit) => habit.id !== habitId),
          completions: state.completions.filter((completion) => completion.habitId !== habitId)
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
          )
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
          completions: upsertCompletion(currentState.completions, nextCompletion)
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
                })
        }));

        return nextSets;
      },
      resetCompletion: (habitId, dateKey = toDateKey()) => {
        set((state) => ({
          completions: state.completions.filter(
            (completion) => !(completion.habitId === habitId && completion.date === dateKey)
          )
        }));
      },
      setTheme: (theme) => set({ theme }),
      updateReminderSettings: (values) =>
        set((state) => ({
          reminderSettings: {
            ...state.reminderSettings,
            ...values
          }
        })),
      resetAppData: () => {
        const freshState = createMockState();
        set({
          ...freshState,
          theme: get().theme,
          reminderSettings: get().reminderSettings,
          hasHydrated: true
        });
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        habits: state.habits,
        completions: state.completions,
        theme: state.theme,
        reminderSettings: state.reminderSettings
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
