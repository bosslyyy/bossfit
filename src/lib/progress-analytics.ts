import { BOSS_POINT_RULES, LEVEL_TITLES, WEEK_DAYS } from "@/lib/constants";
import {
  addDays,
  compareDateKeys,
  endOfMonth,
  formatDayMonth,
  getMonthGridDates,
  getWeekDates,
  getWeekdayKey,
  isSameMonth,
  parseDateKey,
  startOfMonth,
  toDateKey
} from "@/lib/date";
import { getHabitProgress, getHabitsForDate } from "@/lib/habit-logic";
import { safePercentage } from "@/lib/utils";
import type {
  BossProfile,
  CalendarDay,
  CompletionCalendarEntry,
  DailyCompletion,
  DailyOverview,
  Habit,
  LevelProgress,
  ProgressChartPoint,
  WeeklySummary
} from "@/types/habit";

function getTrackingStartDate(habits: Habit[], completions: DailyCompletion[], anchor: Date) {
  const dateKeys = [
    ...habits.map((habit) => toDateKey(new Date(habit.createdAt))),
    ...completions.map((completion) => completion.date)
  ].filter(Boolean);

  if (!dateKeys.length) {
    return anchor;
  }

  const earliest = dateKeys.sort(compareDateKeys)[0];
  return parseDateKey(earliest);
}

function getBaseDailyOverview(habits: Habit[], completions: DailyCompletion[], date: Date) {
  const scheduledHabits = getHabitsForDate(habits, date);
  const progresses = scheduledHabits.map((habit) => ({
    habit,
    progress: getHabitProgress(habit, completions, date)
  }));
  const completedCount = progresses.filter((entry) => entry.progress.isCompleted).length;
  const completedSets = progresses.reduce((total, entry) => total + entry.progress.completedSets, 0);
  const totalSets = progresses.reduce((total, entry) => total + entry.habit.targetSets, 0);
  const scheduledCount = scheduledHabits.length;
  const hasAnyProgress = completedSets > 0;

  let status: DailyOverview["status"] = "none";

  if (scheduledCount > 0) {
    if (completedCount === scheduledCount) {
      status = "complete";
    } else if (hasAnyProgress || completedCount > 0) {
      status = "partial";
    } else {
      status = "missed";
    }
  }

  const basePoints =
    completedSets * BOSS_POINT_RULES.perSet +
    completedCount * BOSS_POINT_RULES.habitCompletionBonus +
    (status === "complete" ? BOSS_POINT_RULES.dayCompletionBonus : 0);

  return {
    date: toDateKey(date),
    scheduledCount,
    completedCount,
    pendingCount: Math.max(scheduledCount - completedCount, 0),
    completionPercentage: safePercentage(completedCount, scheduledCount),
    points: basePoints,
    completedSets,
    totalSets,
    status,
    streakAfterDay: 0
  } satisfies DailyOverview;
}

export function getDailyTimeline(
  habits: Habit[],
  completions: DailyCompletion[],
  anchor: Date = new Date()
) {
  const end = parseDateKey(toDateKey(anchor));
  const start = getTrackingStartDate(habits, completions, end);
  const totalDays = Math.max(
    Math.round((parseDateKey(toDateKey(end)).getTime() - parseDateKey(toDateKey(start)).getTime()) / 86400000),
    0
  );
  const timeline: DailyOverview[] = [];
  let streak = 0;

  for (let index = 0; index <= totalDays; index += 1) {
    const currentDate = addDays(start, index);
    const overview = getBaseDailyOverview(habits, completions, currentDate);

    if (overview.status === "complete") {
      streak += 1;
    } else if (overview.status === "partial" || overview.status === "missed") {
      streak = 0;
    }

    const streakBonus =
      overview.status === "complete" &&
      streak > 0 &&
      streak % BOSS_POINT_RULES.streakMilestoneInterval === 0
        ? BOSS_POINT_RULES.streakMilestoneBonus
        : 0;

    timeline.push({
      ...overview,
      points: overview.points + streakBonus,
      streakAfterDay: streak
    });
  }

  return timeline;
}

export function getCurrentAndBestStreak(timeline: DailyOverview[]) {
  let bestStreak = 0;

  for (const entry of timeline) {
    if (entry.streakAfterDay > bestStreak) {
      bestStreak = entry.streakAfterDay;
    }
  }

  return {
    currentStreak: timeline.length ? timeline[timeline.length - 1].streakAfterDay : 0,
    bestStreak
  };
}

export function getLevelProgress(totalPoints: number): LevelProgress {
  let level = 1;
  let levelStartPoints = 0;
  let nextLevelPoints = 50;

  while (totalPoints >= nextLevelPoints) {
    level += 1;
    levelStartPoints = nextLevelPoints;
    nextLevelPoints += level * 50;
  }

  const pointsIntoLevel = totalPoints - levelStartPoints;
  const pointsRange = nextLevelPoints - levelStartPoints;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const pointsToNextLevel = Math.max(nextLevelPoints - totalPoints, 0);

  return {
    level,
    title,
    currentPoints: totalPoints,
    levelStartPoints,
    nextLevelPoints,
    pointsIntoLevel,
    pointsToNextLevel,
    progressPercentage: safePercentage(pointsIntoLevel, pointsRange),
    message:
      pointsToNextLevel === 0
        ? "Nivel máximo por ahora. Sigue acumulando Boss Points."
        : pointsToNextLevel <= 20
          ? `Te faltan ${pointsToNextLevel} puntos para subir de nivel.`
          : "Mantén el ritmo y tu siguiente nivel llegará pronto."
  };
}

export function getBossProfile(
  habits: Habit[],
  completions: DailyCompletion[],
  anchor: Date = new Date()
): BossProfile {
  const timeline = getDailyTimeline(habits, completions, anchor);
  const todayKey = toDateKey(anchor);
  const streakSummary = getCurrentAndBestStreak(timeline);
  const totalPoints = timeline.reduce((total, entry) => total + entry.points, 0);
  const todayPoints = timeline.find((entry) => entry.date === todayKey)?.points ?? 0;

  return {
    totalPoints,
    todayPoints,
    currentStreak: streakSummary.currentStreak,
    bestStreak: streakSummary.bestStreak,
    levelProgress: getLevelProgress(totalPoints)
  };
}

export function getWeeklySummaryFromTimeline(
  habits: Habit[],
  completions: DailyCompletion[],
  anchor: Date = new Date()
): WeeklySummary {
  const timeline = getDailyTimeline(habits, completions, anchor);
  const weekDateKeys = new Set(getWeekDates(anchor).map((date) => toDateKey(date)));
  const weekEntries = timeline.filter((entry) => weekDateKeys.has(entry.date));
  const streakSummary = getCurrentAndBestStreak(timeline);

  return {
    streak: streakSummary.currentStreak,
    bestStreak: streakSummary.bestStreak,
    completedHabitDays: weekEntries.reduce((total, entry) => total + entry.completedCount, 0),
    scheduledHabitDays: weekEntries.reduce((total, entry) => total + entry.scheduledCount, 0),
    compliance: safePercentage(
      weekEntries.reduce((total, entry) => total + entry.completedCount, 0),
      weekEntries.reduce((total, entry) => total + entry.scheduledCount, 0)
    ),
    completedSets: weekEntries.reduce((total, entry) => total + entry.completedSets, 0),
    totalPoints: weekEntries.reduce((total, entry) => total + entry.points, 0)
  };
}

export function getCompletionCalendarData(
  habits: Habit[],
  completions: DailyCompletion[],
  days = 7,
  anchor: Date = new Date()
): CompletionCalendarEntry[] {
  const timeline = getDailyTimeline(habits, completions, anchor);
  const fromDate = addDays(anchor, -(days - 1));
  const fromKey = toDateKey(fromDate);
  const entries = timeline.filter((entry) => compareDateKeys(entry.date, fromKey) >= 0);

  return entries.map((entry) => {
    const date = parseDateKey(entry.date);
    return {
      date: entry.date,
      shortLabel: WEEK_DAYS.find((day) => day.key === getWeekdayKey(date))?.short ?? "",
      completed: entry.completedCount,
      scheduled: entry.scheduledCount,
      percentage: entry.completionPercentage,
      points: entry.points,
      status: entry.status
    };
  });
}

export function getMonthlyCalendarDays(
  habits: Habit[],
  completions: DailyCompletion[],
  monthAnchor: Date,
  today: Date = new Date()
): CalendarDay[] {
  const monthGridDates = getMonthGridDates(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const effectiveAnchor = compareDateKeys(toDateKey(monthEnd), toDateKey(today)) > 0 ? today : monthEnd;
  const timeline = getDailyTimeline(habits, completions, effectiveAnchor);
  const timelineMap = new Map(timeline.map((entry) => [entry.date, entry]));
  const todayKey = toDateKey(today);

  return monthGridDates.map((date) => {
    const dateKey = toDateKey(date);
    const timelineEntry = timelineMap.get(dateKey);
    const isFuture = compareDateKeys(dateKey, todayKey) > 0;
    const scheduledCount = isFuture ? getHabitsForDate(habits, date).length : timelineEntry?.scheduledCount ?? 0;

    return {
      date: dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: isSameMonth(date, monthAnchor),
      isToday: dateKey === todayKey,
      isFuture,
      status: isFuture ? "none" : timelineEntry?.status ?? "none",
      scheduledCount,
      completedCount: isFuture ? 0 : timelineEntry?.completedCount ?? 0,
      points: isFuture ? 0 : timelineEntry?.points ?? 0
    };
  });
}

export function getChartData(
  habits: Habit[],
  completions: DailyCompletion[],
  days = 7,
  anchor: Date = new Date()
): ProgressChartPoint[] {
  const timeline = getDailyTimeline(habits, completions, anchor);
  const fromDate = addDays(anchor, -(days - 1));
  const fromKey = toDateKey(fromDate);

  return timeline
    .filter((entry) => compareDateKeys(entry.date, fromKey) >= 0)
    .map((entry) => {
      const date = parseDateKey(entry.date);
      return {
        date: entry.date,
        label: formatDayMonth(date),
        shortLabel: WEEK_DAYS.find((day) => day.key === getWeekdayKey(date))?.short ?? "",
        completedHabits: entry.completedCount,
        scheduledHabits: entry.scheduledCount,
        percentage: entry.completionPercentage,
        points: entry.points,
        status: entry.status
      };
    });
}

export function getMonthlyHeadline(monthAnchor: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric"
  }).format(startOfMonth(monthAnchor));
}

