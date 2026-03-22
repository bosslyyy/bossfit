import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { getWeekDays } from "@/lib/i18n";
import type { AppLocale, HabitTrackingMode, WeekdayKey } from "@/types/habit";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix = "bf") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function safePercentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function formatPendingSets(remainingSets: number, locale: AppLocale = "es") {
  if (remainingSets <= 0) {
    return locale === "en" ? "Habit completed" : "Hábito completado";
  }

  if (remainingSets === 1) {
    return locale === "en" ? "1 set left" : "Queda 1 serie pendiente";
  }

  return locale === "en" ? `${remainingSets} sets left` : `Quedan ${remainingSets} series pendientes`;
}

export function formatSeriesProgress(completedSets: number, targetSets: number, locale: AppLocale = "es") {
  return locale === "en"
    ? `${completedSets}/${targetSets} sets completed`
    : `${completedSets}/${targetSets} series completadas`;
}

export function formatDurationShort(totalSeconds: number) {
  const normalizedSeconds = Math.max(Math.round(totalSeconds), 0);
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatRestLabel(restSeconds?: number, locale: AppLocale = "es") {
  return locale === "en"
    ? `Rest ${formatDurationShort(restSeconds ?? 60)}`
    : `Descanso ${formatDurationShort(restSeconds ?? 60)}`;
}

export function formatHabitTarget(
  targetSets: number,
  repsPerSet: number,
  trackingMode: HabitTrackingMode = "reps",
  secondsPerSet?: number
) {
  if (trackingMode === "timer") {
    return `${targetSets} x ${formatDurationShort(secondsPerSet ?? 60)}`;
  }

  return `${targetSets}x${repsPerSet}`;
}

export function calculatePoints(
  completedSets: number,
  repsPerSet: number,
  trackingMode: HabitTrackingMode = "reps",
  secondsPerSet?: number
) {
  const unitValue =
    trackingMode === "timer" ? Math.max(Math.round((secondsPerSet ?? 60) / 10), 1) : repsPerSet;

  return completedSets * unitValue;
}

export function formatSelectedDays(selectedDays: WeekdayKey[], locale: AppLocale = "es") {
  const labels = getWeekDays(locale).filter((day) => selectedDays.includes(day.key)).map((day) => day.short);
  return labels.join(" · ");
}

export function titleCase(value: string) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
