import { WEEK_DAYS } from "@/lib/constants";
import type { WeekdayKey } from "@/types/habit";

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function toDateKey(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function getWeekdayKey(date: Date): WeekdayKey {
  const keys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return keys[date.getDay()];
}

export function getWeekdayMeta(dayKey: WeekdayKey) {
  return WEEK_DAYS.find((day) => day.key === dayKey) ?? WEEK_DAYS[0];
}

export function startOfWeek(date: Date = new Date()) {
  const base = startOfDay(date);
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(base, offset);
}

export function getWeekDates(anchor: Date = new Date()) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function startOfMonth(date: Date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

export function endOfMonth(date: Date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0);
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function getMonthGridDates(anchor: Date = new Date()) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const monthEndWeekStart = startOfWeek(monthEnd);
  const gridEnd = addDays(monthEndWeekStart, 6);
  const totalDays = Math.round((startOfDay(gridEnd).getTime() - startOfDay(gridStart).getTime()) / 86400000) + 1;

  return Array.from({ length: totalDays }, (_, index) => addDays(gridStart, index));
}

export function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short"
  }).format(date);
}

export function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

export function getGreeting(date: Date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Buenos días";
  }

  if (hour < 19) {
    return "Buenas tardes";
  }

  return "Buenas noches";
}
