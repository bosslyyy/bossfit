import type { HabitColor, HabitIcon } from "@/types/habit";
import { getBottomNavItems, getHabitCategories, getHabitIcons, getHabitLevels, getWeekDays } from "@/lib/i18n";

export const APP_VERSION = "BossFit v1.00";

export const ANDROID_APP_PACKAGE = "com.bossfit.app";
export const ANDROID_APK_DOWNLOAD_URL = "https://www.bossfit.lat/apk/latest.apk";
export const ANDROID_MIN_NATIVE_VERSION_CODE = 3;

export const WEEK_DAYS = getWeekDays("es");
export const HABIT_CATEGORIES = getHabitCategories("es");
export const HABIT_LEVELS = getHabitLevels("es");
export const HABIT_ICONS = getHabitIcons("es");
export const BOTTOM_NAV_ITEMS = getBottomNavItems("es");

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

export const BOSS_POINT_RULES = {
  perSet: 5,
  habitCompletionBonus: 10,
  dayCompletionBonus: 20,
  streakMilestoneBonus: 35,
  streakMilestoneInterval: 7
} as const;

export const STORAGE_KEY = "bossfit-store";
export const STORAGE_VERSION = 6;

