import type { AppLocale, HabitCategory, HabitColor, HabitIcon, HabitLevel, WeekdayKey } from "@/types/habit";

export const DEFAULT_LOCALE: AppLocale = "es";
export const LOCALE_COOKIE_NAME = "bossfit-locale";

export const LOCALE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" }
];

const WEEK_DAYS_BY_LOCALE: Record<
  AppLocale,
  Array<{ key: WeekdayKey; short: string; label: string; dayIndex: number }>
> = {
  es: [
    { key: "mon", short: "L", label: "Lunes", dayIndex: 1 },
    { key: "tue", short: "M", label: "Martes", dayIndex: 2 },
    { key: "wed", short: "X", label: "Miércoles", dayIndex: 3 },
    { key: "thu", short: "J", label: "Jueves", dayIndex: 4 },
    { key: "fri", short: "V", label: "Viernes", dayIndex: 5 },
    { key: "sat", short: "S", label: "Sábado", dayIndex: 6 },
    { key: "sun", short: "D", label: "Domingo", dayIndex: 0 }
  ],
  en: [
    { key: "mon", short: "Mo", label: "Monday", dayIndex: 1 },
    { key: "tue", short: "Tu", label: "Tuesday", dayIndex: 2 },
    { key: "wed", short: "We", label: "Wednesday", dayIndex: 3 },
    { key: "thu", short: "Th", label: "Thursday", dayIndex: 4 },
    { key: "fri", short: "Fr", label: "Friday", dayIndex: 5 },
    { key: "sat", short: "Sa", label: "Saturday", dayIndex: 6 },
    { key: "sun", short: "Su", label: "Sunday", dayIndex: 0 }
  ]
};

const HABIT_CATEGORIES_BY_LOCALE: Record<AppLocale, Array<{ value: HabitCategory; label: string }>> = {
  es: [
    { value: "fuerza", label: "Fuerza" },
    { value: "cardio", label: "Cardio" },
    { value: "movilidad", label: "Movilidad" },
    { value: "abdomen", label: "Abdomen" },
    { value: "piernas", label: "Piernas" },
    { value: "recuperacion", label: "Recuperación" }
  ],
  en: [
    { value: "fuerza", label: "Strength" },
    { value: "cardio", label: "Cardio" },
    { value: "movilidad", label: "Mobility" },
    { value: "abdomen", label: "Core" },
    { value: "piernas", label: "Legs" },
    { value: "recuperacion", label: "Recovery" }
  ]
};

const HABIT_LEVELS_BY_LOCALE: Record<AppLocale, Array<{ value: HabitLevel; label: string }>> = {
  es: [
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzado", label: "Avanzado" }
  ],
  en: [
    { value: "principiante", label: "Beginner" },
    { value: "intermedio", label: "Intermediate" },
    { value: "avanzado", label: "Advanced" }
  ]
};

const HABIT_ICONS_BY_LOCALE: Record<AppLocale, Array<{ value: HabitIcon; label: string }>> = {
  es: [
    { value: "flame", label: "Fuego" },
    { value: "dumbbell", label: "Mancuerna" },
    { value: "heart", label: "Pulso" },
    { value: "mountain", label: "Cumbre" },
    { value: "bolt", label: "Impacto" },
    { value: "timer", label: "Ritmo" }
  ],
  en: [
    { value: "flame", label: "Flame" },
    { value: "dumbbell", label: "Dumbbell" },
    { value: "heart", label: "Pulse" },
    { value: "mountain", label: "Peak" },
    { value: "bolt", label: "Impact" },
    { value: "timer", label: "Pace" }
  ]
};

const HABIT_COLOR_LABELS: Record<AppLocale, Record<HabitColor, string>> = {
  es: {
    ember: "Energía",
    emerald: "Momentum",
    ocean: "Flow",
    sun: "Spark",
    rose: "Impacto",
    graphite: "Elite"
  },
  en: {
    ember: "Energy",
    emerald: "Momentum",
    ocean: "Flow",
    sun: "Spark",
    rose: "Impact",
    graphite: "Elite"
  }
};

const LEVEL_TITLES_BY_LOCALE: Record<AppLocale, readonly string[]> = {
  es: ["Base", "Momentum", "Disciplina", "Enfoque", "Dominio", "Boss"],
  en: ["Base", "Momentum", "Discipline", "Focus", "Mastery", "Boss"]
};

export function normalizeLocale(value: unknown): AppLocale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

export function getIntlLocale(locale: AppLocale = DEFAULT_LOCALE) {
  return locale === "en" ? "en-US" : "es-CR";
}

export function getWeekDays(locale: AppLocale = DEFAULT_LOCALE) {
  return WEEK_DAYS_BY_LOCALE[locale];
}

export function getHabitCategories(locale: AppLocale = DEFAULT_LOCALE) {
  return HABIT_CATEGORIES_BY_LOCALE[locale];
}

export function getHabitLevels(locale: AppLocale = DEFAULT_LOCALE) {
  return HABIT_LEVELS_BY_LOCALE[locale];
}

export function getHabitIcons(locale: AppLocale = DEFAULT_LOCALE) {
  return HABIT_ICONS_BY_LOCALE[locale];
}

export function getHabitColorLabel(locale: AppLocale, color: HabitColor) {
  return HABIT_COLOR_LABELS[locale][color];
}

export function getCategoryLabel(locale: AppLocale, value?: HabitCategory | null) {
  if (!value) {
    return "Fitness";
  }

  return HABIT_CATEGORIES_BY_LOCALE[locale].find((entry) => entry.value === value)?.label ?? value;
}

export function getLevelLabel(locale: AppLocale, value?: HabitLevel | null) {
  if (!value) {
    return locale === "en" ? "Custom" : "Personalizado";
  }

  return HABIT_LEVELS_BY_LOCALE[locale].find((entry) => entry.value === value)?.label ?? value;
}

export function getBottomNavItems(locale: AppLocale = DEFAULT_LOCALE) {
  return locale === "en"
    ? [
        { href: "/", label: "Home", icon: "home" as const },
        { href: "/today", label: "Today", icon: "today" as const },
        { href: "/progress", label: "Progress", icon: "progress" as const },
        { href: "/settings", label: "Settings", icon: "settings" as const }
      ]
    : [
        { href: "/", label: "Inicio", icon: "home" as const },
        { href: "/today", label: "Hoy", icon: "today" as const },
        { href: "/progress", label: "Progreso", icon: "progress" as const },
        { href: "/settings", label: "Ajustes", icon: "settings" as const }
      ];
}

export function getLevelTitles(locale: AppLocale = DEFAULT_LOCALE) {
  return LEVEL_TITLES_BY_LOCALE[locale];
}

export function formatRemainingSetsLabel(locale: AppLocale, remainingSets: number) {
  if (remainingSets <= 0) {
    return locale === "en" ? "Habit completed" : "Hábito completado";
  }

  if (remainingSets === 1) {
    return locale === "en" ? "1 set left" : "Queda 1 serie pendiente";
  }

  return locale === "en" ? `${remainingSets} sets left` : `Quedan ${remainingSets} series pendientes`;
}

export function formatSeriesProgressLabel(locale: AppLocale, completedSets: number, targetSets: number) {
  return locale === "en"
    ? `${completedSets}/${targetSets} sets completed`
    : `${completedSets}/${targetSets} series completadas`;
}

export function readLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return normalizeLocale(decodeURIComponent(match.split("=").slice(1).join("=")));
}

export function writeLocaleCookie(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
}
