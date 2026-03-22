import { getWeekDays } from "@/lib/i18n";
import { addDays, getWeekDates, getWeekdayKey, parseDateKey, toDateKey } from "@/lib/date";
import { calculatePoints, formatPendingSets, safePercentage } from "@/lib/utils";
import type {
  AppLocale,
  DailyCompletion,
  DashboardSnapshot,
  Habit,
  HabitHistoryPoint,
  HabitProgress,
  WeeklySummary
} from "@/types/habit";

export function getCompletionRecord(
  completions: DailyCompletion[],
  habitId: string,
  dateKey: string
) {
  return completions.find((completion) => completion.habitId === habitId && completion.date === dateKey);
}

export function isHabitScheduledForDate(habit: Habit, date: Date) {
  return habit.active && habit.selectedDays.includes(getWeekdayKey(date));
}

export function getHabitsForDate(habits: Habit[], date: Date) {
  return habits.filter((habit) => isHabitScheduledForDate(habit, date));
}

export function getHabitProgress(
  habit: Habit,
  completions: DailyCompletion[],
  date: Date = new Date(),
  locale: AppLocale = "es"
): HabitProgress {
  const dateKey = toDateKey(date);
  const completion = getCompletionRecord(completions, habit.id, dateKey);
  const completedSets = Math.min(completion?.completedSets ?? 0, habit.targetSets);
  const remainingSets = Math.max(habit.targetSets - completedSets, 0);

  return {
    habitId: habit.id,
    date: dateKey,
    completedSets,
    remainingSets,
    isCompleted: remainingSets === 0,
    completionRatio: habit.targetSets ? completedSets / habit.targetSets : 0,
    statusMessage: formatPendingSets(remainingSets, locale)
  };
}

export function calculateCurrentStreak(
  habits: Habit[],
  completions: DailyCompletion[],
  date: Date = new Date(),
  locale: AppLocale = "es"
) {
  let streak = 0;

  for (let offset = 0; offset < 90; offset += 1) {
    const currentDate = addDays(date, -offset);
    const scheduledHabits = getHabitsForDate(habits, currentDate);

    if (!scheduledHabits.length) {
      continue;
    }

    const allCompleted = scheduledHabits.every((habit) =>
      getHabitProgress(habit, completions, currentDate, locale).isCompleted
    );

    if (!allCompleted) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function getDashboardSnapshot(
  habits: Habit[],
  completions: DailyCompletion[],
  date: Date = new Date(),
  locale: AppLocale = "es"
): DashboardSnapshot {
  const scheduledHabits = getHabitsForDate(habits, date);
  const completedHabits = scheduledHabits.filter((habit) => getHabitProgress(habit, completions, date, locale).isCompleted)
    .length;
  const pendingHabits = Math.max(scheduledHabits.length - completedHabits, 0);
  const totalPoints = scheduledHabits.reduce((total, habit) => {
    const progress = getHabitProgress(habit, completions, date, locale);
    return total + calculatePoints(progress.completedSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet);
  }, 0);

  return {
    scheduledHabits,
    completedHabits,
    pendingHabits,
    completionPercentage: safePercentage(completedHabits, scheduledHabits.length),
    totalPoints,
    streak: calculateCurrentStreak(habits, completions, date, locale),
    activeHabits: habits.filter((habit) => habit.active).length
  };
}

export function getWeeklySummary(
  habits: Habit[],
  completions: DailyCompletion[],
  date: Date = new Date(),
  locale: AppLocale = "es"
): WeeklySummary {
  const weekDates = getWeekDates(date);
  let scheduledHabitDays = 0;
  let completedHabitDays = 0;
  let completedSets = 0;
  let totalPoints = 0;

  for (const currentDate of weekDates) {
    const scheduledHabits = getHabitsForDate(habits, currentDate);
    scheduledHabitDays += scheduledHabits.length;

    for (const habit of scheduledHabits) {
      const progress = getHabitProgress(habit, completions, currentDate, locale);
      completedSets += progress.completedSets;
      totalPoints += calculatePoints(progress.completedSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet);

      if (progress.isCompleted) {
        completedHabitDays += 1;
      }
    }
  }

  return {
    streak: calculateCurrentStreak(habits, completions, date, locale),
    bestStreak: calculateCurrentStreak(habits, completions, date, locale),
    completedHabitDays,
    scheduledHabitDays,
    compliance: safePercentage(completedHabitDays, scheduledHabitDays),
    completedSets,
    totalPoints
  };
}

export function getHabitHistory(
  habit: Habit,
  completions: DailyCompletion[],
  days = 7,
  anchor: Date = new Date(),
  locale: AppLocale = "es"
): HabitHistoryPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(anchor, index - (days - 1));
    const dateKey = toDateKey(date);
    const progress = getHabitProgress(habit, completions, date, locale);
    const shortLabel = getWeekDays(locale).find((day) => day.key === getWeekdayKey(date))?.short ?? "";

    return {
      date: dateKey,
      shortLabel,
      scheduled: isHabitScheduledForDate(habit, date),
      completedSets: progress.completedSets,
      targetSets: habit.targetSets,
      isCompleted: progress.isCompleted
    };
  });
}

export function getCompletionCalendar(
  habits: Habit[],
  completions: DailyCompletion[],
  days = 7,
  anchor: Date = new Date(),
  locale: AppLocale = "es"
) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(anchor, index - (days - 1));
    const snapshot = getDashboardSnapshot(habits, completions, date, locale);
    return {
      date: toDateKey(date),
      shortLabel: getWeekDays(locale).find((day) => day.key === getWeekdayKey(date))?.short ?? "",
      completed: snapshot.completedHabits,
      scheduled: snapshot.scheduledHabits.length,
      percentage: snapshot.completionPercentage
    };
  });
}

export function getLastUpdatedLabel(dateKey: string, locale: AppLocale = "es") {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    day: "numeric",
    month: "short"
  }).format(date);
}
