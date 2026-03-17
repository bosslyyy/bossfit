"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { Button } from "@/components/ui/button";
import { HABIT_COLORS } from "@/lib/constants";
import { cn, formatHabitTarget } from "@/lib/utils";
import { useBossFitStore } from "@/store/use-bossfit-store";
import type { Habit, HabitProgress } from "@/types/habit";

const burstOffsets = [8, 20, 34, 48, 62, 76, 88];

export function TodayHabitCard({
  habit,
  progress,
  variant = progress.isCompleted ? "completed" : "active"
}: {
  habit: Habit;
  progress: HabitProgress;
  variant?: "active" | "completed";
}) {
  const completeSet = useBossFitStore((state) => state.completeSet);
  const undoSet = useBossFitStore((state) => state.undoSet);
  const [celebrate, setCelebrate] = useState(false);
  const swatch = HABIT_COLORS.find((entry) => entry.value === habit.color)?.swatch ?? "#EF4444";
  const isCompleted = progress.isCompleted || variant === "completed";

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

  return (
    <article className="relative px-5 py-5">
      {celebrate ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {burstOffsets.map((offset, index) => (
            <span
              key={offset}
              className="absolute top-[38%] h-2.5 w-2.5 rounded-full animate-confetti"
              style={{
                left: `${offset}%`,
                backgroundColor: swatch,
                animationDelay: `${index * 55}ms`
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-start gap-4">
        <div className="w-[4.5rem] shrink-0">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-sm"
            style={{
              backgroundColor: `${swatch}26`,
              borderColor: `${swatch}30`,
              color: swatch
            }}
          >
            <HabitIcon icon={habit.icon} className="h-5 w-5" />
          </div>
          <p className="mt-2 text-center text-sm font-semibold" style={{ color: swatch }}>
            {habit.targetSets}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <h3
            className={cn(
              "font-display text-[1.18rem] font-semibold leading-[1.2] text-card-foreground",
              isCompleted && "text-muted-foreground line-through decoration-border decoration-2"
            )}
          >
            {habit.name} - {formatHabitTarget(habit.targetSets, habit.repsPerSet)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {progress.completedSets} / {habit.targetSets} series completadas
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button
            className={cn(
              "h-12 min-w-[8.4rem] rounded-full border px-5 text-sm font-semibold shadow-none",
              isCompleted
                ? "border-border/80 bg-background text-muted-foreground"
                : "border-border/80 bg-surface text-card-foreground hover:bg-background"
            )}
            onClick={handleComplete}
            disabled={progress.isCompleted}
          >
            {isCompleted ? "Listo" : "+ 1"}
          </Button>

          <Button
            variant="ghost"
            className="h-9 rounded-full px-3 text-muted-foreground hover:bg-surface hover:text-card-foreground"
            onClick={() => undoSet(habit.id)}
            disabled={progress.completedSets === 0}
            aria-label={`Deshacer una serie en ${habit.name}`}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

