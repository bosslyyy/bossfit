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

export type ThemeMode = "light" | "dark";

export interface HabitSchedule {
  habitId: string;
  days: WeekdayKey[];
}

export interface Habit {
  id: string;
  name: string;
  category?: HabitCategory;
  targetSets: number;
  repsPerSet: number;
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
