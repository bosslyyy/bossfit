"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, Trophy } from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HABIT_COLORS, HABIT_COLOR_STYLES } from "@/lib/constants";
import { formatHabitTarget, formatSeriesProgress } from "@/lib/utils";
import { useBossFitStore } from "@/store/use-bossfit-store";
import type { Habit, HabitProgress } from "@/types/habit";

const burstOffsets = [8, 20, 34, 48, 62, 76, 88];

export function TodayHabitCard({ habit, progress }: { habit: Habit; progress: HabitProgress }) {
  const completeSet = useBossFitStore((state) => state.completeSet);
  const undoSet = useBossFitStore((state) => state.undoSet);
  const [celebrate, setCelebrate] = useState(false);
  const styles = HABIT_COLOR_STYLES[habit.color];
  const swatch = HABIT_COLORS.find((entry) => entry.value === habit.color)?.swatch ?? "#0F7C59";

  useEffect(() => {
    if (!celebrate) {
      return;
    }

    const timer = window.setTimeout(() => setCelebrate(false), 950);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  const handleComplete = () => {
    const result = completeSet(habit.id);
    if (result?.justCompleted) {
      setCelebrate(true);
    }
  };

  const completionPercent = Math.round(progress.completionRatio * 100);

  return (
    <Card className={`relative overflow-hidden border bg-card dark:!border-border dark:bg-[#121922] dark:shadow-[0_14px_32px_rgba(2,8,16,0.34)] ${styles.border}`}>
      {celebrate ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {burstOffsets.map((offset, index) => (
            <span
              key={offset}
              className="absolute top-1/2 h-2.5 w-2.5 rounded-full animate-confetti"
              style={{
                left: `${offset}%`,
                backgroundColor: swatch,
                animationDelay: `${index * 55}ms`
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-5 text-card-foreground">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-card-foreground shadow-sm ring-1 ring-border dark:bg-surface dark:ring-border">
              <HabitIcon icon={habit.icon} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-xl font-semibold text-card-foreground">{habit.name}</h3>
                {progress.isCompleted ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
              </div>
              <p className="text-sm text-muted-foreground">{formatHabitTarget(habit.targetSets, habit.repsPerSet)}</p>
            </div>
          </div>
          <Badge className={`${styles.badge} ring-1 ring-border/60 dark:ring-border`}>{completionPercent}%</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatSeriesProgress(progress.completedSets, habit.targetSets)}</span>
            <span>{progress.remainingSets} por completar</span>
          </div>
          <ProgressBar value={completionPercent} indicatorClassName={`bg-gradient-to-r ${styles.progress}`} />
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {Array.from({ length: habit.targetSets }, (_, index) => {
            const completed = index < progress.completedSets;
            return (
              <div
                key={`${habit.id}-set-${index + 1}`}
                className={`flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                  completed
                    ? `${styles.solid} border-transparent text-white`
                    : "border-border bg-muted text-muted-foreground dark:bg-surface"
                }`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

        <div className="rounded-[22px] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground dark:bg-surface">
          <p className="font-medium text-card-foreground">{progress.statusMessage}</p>
          {progress.isCompleted ? (
            <p className="mt-1 flex items-center gap-2 text-success">
              <Trophy className="h-4 w-4" />
              Completaste tu hábito de hoy.
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" size="lg" onClick={handleComplete} disabled={progress.isCompleted}>
            Completar 1 serie
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="px-4"
            onClick={() => undoSet(habit.id)}
            disabled={progress.completedSets === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
