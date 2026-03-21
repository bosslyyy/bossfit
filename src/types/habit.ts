export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type HabitCategory =
  | "fuerza"
  | "cardio"
  | "movilidad"
  | "abdomen"
  | "piernas"
  | "recuperacion";

export type HabitLevel = "principiante" | "intermedio" | "avanzado";

export type HabitColor = "ember" | "emerald" | "ocean" | "sun" | "rose" | "graphite";

export type HabitIcon = "flame" | "dumbbell" | "heart" | "mountain" | "bolt" | "timer";

export type HabitTrackingMode = "reps" | "timer";

export type ThemeMode = "light" | "dark";

export type DayCompletionStatus = "complete" | "partial" | "missed" | "none";

export type ReminderPermissionState = NotificationPermission | "unsupported";

export interface HabitSchedule {
  habitId: string;
  days: WeekdayKey[];
}

export interface Habit {
  id: string;
  name: string;
  category?: HabitCategory;
  trackingMode: HabitTrackingMode;
  targetSets: number;
  repsPerSet: number;
  secondsPerSet?: number;
  selectedDays: WeekdayKey[];
  active: boolean;
  color: HabitColor;
  icon: HabitIcon;
  level?: HabitLevel;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCompletion {
  habitId: string;
  date: string;
  completedSets: number;
  updatedAt: string;
  completedAt?: string;
}

export interface HabitProgress {
  habitId: string;
  date: string;
  completedSets: number;
  remainingSets: number;
  isCompleted: boolean;
  completionRatio: number;
  statusMessage: string;
}

export interface DailyOverview {
  date: string;
  scheduledCount: number;
  completedCount: number;
  pendingCount: number;
  completionPercentage: number;
  points: number;
  completedSets: number;
  totalSets: number;
  status: DayCompletionStatus;
  streakAfterDay: number;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentPoints: number;
  levelStartPoints: number;
  nextLevelPoints: number;
  progressPercentage: number;
  pointsToNextLevel: number;
  pointsIntoLevel: number;
  message: string;
}

export interface BossProfile {
  totalPoints: number;
  todayPoints: number;
  currentStreak: number;
  bestStreak: number;
  levelProgress: LevelProgress;
}

export interface DashboardSnapshot {
  scheduledHabits: Habit[];
  completedHabits: number;
  pendingHabits: number;
  completionPercentage: number;
  totalPoints: number;
  streak: number;
  activeHabits: number;
}

export interface WeeklySummary {
  streak: number;
  bestStreak: number;
  completedHabitDays: number;
  scheduledHabitDays: number;
  compliance: number;
  completedSets: number;
  totalPoints: number;
}

export interface HabitHistoryPoint {
  date: string;
  shortLabel: string;
  scheduled: boolean;
  completedSets: number;
  targetSets: number;
  isCompleted: boolean;
}

export interface CompletionCalendarEntry {
  date: string;
  shortLabel: string;
  completed: number;
  scheduled: number;
  percentage: number;
  points: number;
  status: DayCompletionStatus;
}

export interface ProgressChartPoint {
  date: string;
  label: string;
  shortLabel: string;
  completedHabits: number;
  scheduledHabits: number;
  percentage: number;
  points: number;
  status: DayCompletionStatus;
}

export interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  status: DayCompletionStatus;
  scheduledCount: number;
  completedCount: number;
  points: number;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string;
  permission: ReminderPermissionState;
  lastSentDate?: string;
}

export type RemoteSaveReason = "sync" | "reset" | "signout" | "pagehide" | "bootstrap" | "recovery";

export interface CloudSyncState {
  userId?: string;
  lastLocalChangeAt?: string;
  lastSyncedAt?: string;
  revision?: number;
  pendingRemoteReason?: RemoteSaveReason;
}
