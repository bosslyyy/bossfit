"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import { HABIT_COLOR_STYLES } from "@/lib/constants";
import { getLevelLabel, getWeekDays } from "@/lib/i18n";
import { cn, formatHabitTarget } from "@/lib/utils";
import type { HabitFormValues } from "@/lib/validation/habit";

import { HabitIcon } from "./habit-icon";

export function HabitPreview({ values }: { values: HabitFormValues }) {
  const locale = useAppLocale();
  const styles = HABIT_COLOR_STYLES[values.color];
  const selectedDays = getWeekDays(locale).filter((day) => values.selectedDays.includes(day.key)).map((day) => day.short);

  return (
    <Card className={`border bg-card dark:!border-border dark:bg-[#121922] dark:shadow-[0_14px_32px_rgba(2,8,16,0.34)] ${styles.border}`}>
      <div className="flex items-start justify-between gap-3 text-white">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-card-foreground shadow-sm ring-1 ring-border dark:bg-surface dark:ring-border">
            <HabitIcon icon={values.icon} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-white">
              {values.name || (locale === "en" ? "Your new habit" : "Tu nuevo ejercicio")}
            </h3>
            <p className="text-sm text-white/70">
              {formatHabitTarget(values.targetSets, values.repsPerSet, values.trackingMode, values.secondsPerSet)} · {selectedDays.join(" · ") || (locale === "en" ? "Select days" : "Selecciona días")}
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            styles.badge,
            "ring-1 ring-border/50 dark:bg-surface dark:text-card-foreground dark:ring-border"
          )}
        >
          {getLevelLabel(locale, values.level)}
        </Badge>
      </div>
    </Card>
  );
}

