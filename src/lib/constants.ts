import type { HabitColor, HabitIcon, WeekdayKey } from "@/types/habit";

export const APP_VERSION = "BossFit v1.00";

export const WEEK_DAYS: Array<{
  key: WeekdayKey;
  short: string;
  label: string;
  dayIndex: number;
}> = [
  { key: "mon", short: "L", label: "Lunes", dayIndex: 1 },
  { key: "tue", short: "M", label: "Martes", dayIndex: 2 },
  { key: "wed", short: "X", label: "Miércoles", dayIndex: 3 },
  { key: "thu", short: "J", label: "Jueves", dayIndex: 4 },
  { key: "fri", short: "V", label: "Viernes", dayIndex: 5 },
  { key: "sat", short: "S", label: "Sábado", dayIndex: 6 },
  { key: "sun", short: "D", label: "Domingo", dayIndex: 0 }
];

export const HABIT_CATEGORIES = [
  { value: "fuerza", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "movilidad", label: "Movilidad" },
  { value: "abdomen", label: "Abdomen" },
  { value: "piernas", label: "Piernas" },
  { value: "recuperacion", label: "Recuperación" }
] as const;

export const HABIT_LEVELS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" }
] as const;

export const HABIT_COLORS: Array<{
  value: HabitColor;
  label: string;
  swatch: string;
}> = [
  { value: "ember", label: "Energía", swatch: "#F47C22" },
  { value: "emerald", label: "Momentum", swatch: "#0F7C59" },
  { value: "ocean", label: "Flow", swatch: "#1565C0" },
  { value: "sun", label: "Spark", swatch: "#F6B21A" },
  { value: "rose", label: "Impacto", swatch: "#D9607E" },
  { value: "graphite", label: "Elite", swatch: "#344054" }
];

export const HABIT_COLOR_STYLES: Record<
  HabitColor,
  {
    badge: string;
    border: string;
    text: string;
    surface: string;
    solid: string;
    softRing: string;
    progress: string;
  }
> = {
  ember: {
    badge: "bg-[#FFF1E8] text-[#A54A11]",
    border: "border-[#FFBE8D]",
    text: "text-[#A54A11]",
    surface: "from-[#FFF8F2] to-[#FFF0E6]",
    solid: "bg-[#F47C22]",
    softRing: "ring-[#F47C22]/20",
    progress: "from-[#F47C22] to-[#FF9D4D]"
  },
  emerald: {
    badge: "bg-[#E9F8F0] text-[#0E6B4C]",
    border: "border-[#9BD4BC]",
    text: "text-[#0E6B4C]",
    surface: "from-[#F6FFF9] to-[#EAF8F0]",
    solid: "bg-[#0F7C59]",
    softRing: "ring-[#0F7C59]/20",
    progress: "from-[#0F7C59] to-[#24A47E]"
  },
  ocean: {
    badge: "bg-[#EEF6FF] text-[#1558A0]",
    border: "border-[#A9CCF4]",
    text: "text-[#1558A0]",
    surface: "from-[#F7FBFF] to-[#EDF5FF]",
    solid: "bg-[#1565C0]",
    softRing: "ring-[#1565C0]/20",
    progress: "from-[#1565C0] to-[#3B82F6]"
  },
  sun: {
    badge: "bg-[#FFF8E7] text-[#A46A00]",
    border: "border-[#F4D171]",
    text: "text-[#A46A00]",
    surface: "from-[#FFFDF5] to-[#FFF5D9]",
    solid: "bg-[#F6B21A]",
    softRing: "ring-[#F6B21A]/20",
    progress: "from-[#F6B21A] to-[#FCD34D]"
  },
  rose: {
    badge: "bg-[#FFF0F5] text-[#A34461]",
    border: "border-[#EAAAC0]",
    text: "text-[#A34461]",
    surface: "from-[#FFF9FB] to-[#FFF0F5]",
    solid: "bg-[#D9607E]",
    softRing: "ring-[#D9607E]/20",
    progress: "from-[#D9607E] to-[#F28BA8]"
  },
  graphite: {
    badge: "bg-[#EEF1F5] text-[#344054]",
    border: "border-[#BAC2CF]",
    text: "text-[#344054]",
    surface: "from-[#F8FAFC] to-[#EDF1F5]",
    solid: "bg-[#344054]",
    softRing: "ring-[#344054]/20",
    progress: "from-[#344054] to-[#667085]"
  }
};

export const HABIT_ICONS: Array<{ value: HabitIcon; label: string }> = [
  { value: "flame", label: "Fuego" },
  { value: "dumbbell", label: "Mancuerna" },
  { value: "heart", label: "Pulso" },
  { value: "mountain", label: "Cumbre" },
  { value: "bolt", label: "Impacto" },
  { value: "timer", label: "Ritmo" }
];

export const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/today", label: "Hoy", icon: "today" },
  { href: "/progress", label: "Progreso", icon: "progress" },
  { href: "/settings", label: "Ajustes", icon: "settings" }
] as const;

export const BOSS_POINT_RULES = {
  perSet: 5,
  habitCompletionBonus: 10,
  dayCompletionBonus: 20,
  streakMilestoneBonus: 35,
  streakMilestoneInterval: 7
} as const;

export const LEVEL_TITLES = [
  "Base",
  "Momentum",
  "Disciplina",
  "Enfoque",
  "Dominio",
  "Boss"
] as const;

export const STORAGE_KEY = "bossfit-store";
export const STORAGE_VERSION = 5;
