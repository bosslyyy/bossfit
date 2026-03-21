import { toDateKey } from "@/lib/date";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/persistence";
import type { BossFitRemoteSnapshot } from "@/lib/supabase/data";
import { generateId } from "@/lib/utils";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { DailyCompletion, Habit, ReminderSettings, ThemeMode } from "@/types/habit";

export class SnapshotMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotMutationError";
  }
}

export interface CompletionMutationResult {
  completedSets: number;
  justCompleted: boolean;
}

export interface UndoMutationResult {
  completedSets: number;
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

function withUpdatedHabit(
  snapshot: BossFitRemoteSnapshot,
  habitId: string,
  updater: (habit: Habit) => Habit
) {
  let found = false;
  const habits = snapshot.habits.map((habit) => {
    if (habit.id !== habitId) {
      return habit;
    }

    found = true;
    return updater(habit);
  });

  if (!found) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  return {
    ...snapshot,
    habits
  };
}

export function addHabitToSnapshot(snapshot: BossFitRemoteSnapshot, values: HabitFormValues) {
  const timestamp = new Date().toISOString();
  const habitId = generateId("habit");
  const nextHabit: Habit = {
    id: habitId,
    name: values.name,
    category: values.category,
    trackingMode: values.trackingMode,
    targetSets: values.targetSets,
    repsPerSet: values.repsPerSet,
    secondsPerSet: values.secondsPerSet,
    restEnabled: values.restEnabled,
    restSeconds: values.restSeconds,
    selectedDays: values.selectedDays,
    active: values.active,
    color: values.color,
    icon: values.icon,
    level: values.level,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return {
    snapshot: {
      ...snapshot,
      habits: [nextHabit, ...snapshot.habits]
    },
    result: {
      habitId,
      habit: nextHabit
    }
  };
}

export function updateHabitInSnapshot(
  snapshot: BossFitRemoteSnapshot,
  habitId: string,
  values: HabitFormValues
) {
  const nextSnapshot = withUpdatedHabit(snapshot, habitId, (habit) => ({
    ...habit,
    name: values.name,
    category: values.category,
    trackingMode: values.trackingMode,
    targetSets: values.targetSets,
    repsPerSet: values.repsPerSet,
    secondsPerSet: values.secondsPerSet,
    restEnabled: values.restEnabled,
    restSeconds: values.restSeconds,
    selectedDays: values.selectedDays,
    active: values.active,
    color: values.color,
    icon: values.icon,
    level: values.level,
    updatedAt: new Date().toISOString()
  }));

  return {
    snapshot: nextSnapshot,
    result: { habitId }
  };
}

export function deleteHabitFromSnapshot(snapshot: BossFitRemoteSnapshot, habitId: string) {
  const nextHabits = snapshot.habits.filter((habit) => habit.id !== habitId);

  if (nextHabits.length === snapshot.habits.length) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  return {
    snapshot: {
      ...snapshot,
      habits: nextHabits,
      completions: snapshot.completions.filter((completion) => completion.habitId !== habitId)
    },
    result: { habitId }
  };
}

export function toggleHabitActiveInSnapshot(snapshot: BossFitRemoteSnapshot, habitId: string) {
  let active = false;
  const nextSnapshot = withUpdatedHabit(snapshot, habitId, (habit) => {
    active = !habit.active;
    return {
      ...habit,
      active,
      updatedAt: new Date().toISOString()
    };
  });

  return {
    snapshot: nextSnapshot,
    result: { habitId, active }
  };
}

export function completeSetInSnapshot(
  snapshot: BossFitRemoteSnapshot,
  habitId: string,
  dateKey = toDateKey()
) {
  const habit = snapshot.habits.find((entry) => entry.id === habitId);

  if (!habit) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const currentCompletion =
    snapshot.completions.find(
      (completion) => completion.habitId === habitId && completion.date === dateKey
    ) ?? null;
  const currentSets = currentCompletion?.completedSets ?? 0;
  const nextSets = Math.min(currentSets + 1, habit.targetSets);

  if (nextSets === currentSets) {
    return {
      snapshot,
      result: {
        completedSets: currentSets,
        justCompleted: currentSets === habit.targetSets
      } satisfies CompletionMutationResult
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

  return {
    snapshot: {
      ...snapshot,
      completions: upsertCompletion(snapshot.completions, nextCompletion)
    },
    result: {
      completedSets: nextSets,
      justCompleted: nextSets === habit.targetSets
    } satisfies CompletionMutationResult
  };
}

export function undoSetInSnapshot(snapshot: BossFitRemoteSnapshot, habitId: string, dateKey = toDateKey()) {
  const habit = snapshot.habits.find((entry) => entry.id === habitId);

  if (!habit) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const currentCompletion =
    snapshot.completions.find(
      (completion) => completion.habitId === habitId && completion.date === dateKey
    ) ?? null;
  const currentSets = currentCompletion?.completedSets ?? 0;
  const nextSets = Math.max(currentSets - 1, 0);

  const completions =
    nextSets === 0
      ? snapshot.completions.filter(
          (completion) => !(completion.habitId === habitId && completion.date === dateKey)
        )
      : upsertCompletion(snapshot.completions, {
          habitId,
          date: dateKey,
          completedSets: nextSets,
          updatedAt: new Date().toISOString()
        });

  return {
    snapshot: {
      ...snapshot,
      completions
    },
    result: {
      completedSets: nextSets
    } satisfies UndoMutationResult
  };
}

export function resetCompletionInSnapshot(
  snapshot: BossFitRemoteSnapshot,
  habitId: string,
  dateKey = toDateKey()
) {
  return {
    snapshot: {
      ...snapshot,
      completions: snapshot.completions.filter(
        (completion) => !(completion.habitId === habitId && completion.date === dateKey)
      )
    },
    result: { habitId, dateKey }
  };
}

export function setThemeInSnapshot(snapshot: BossFitRemoteSnapshot, theme: ThemeMode) {
  return {
    snapshot: {
      ...snapshot,
      theme
    },
    result: { theme }
  };
}

export function updateReminderSettingsInSnapshot(
  snapshot: BossFitRemoteSnapshot,
  values: Partial<ReminderSettings>
) {
  const reminderSettings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...snapshot.reminderSettings,
    ...values
  };

  return {
    snapshot: {
      ...snapshot,
      reminderSettings
    },
    result: {
      reminderSettings
    }
  };
}

export function resetAppDataInSnapshot(snapshot: BossFitRemoteSnapshot) {
  return {
    snapshot: {
      habits: [],
      completions: [],
      theme: snapshot.theme,
      reminderSettings: snapshot.reminderSettings
    },
    result: { reset: true }
  };
}
