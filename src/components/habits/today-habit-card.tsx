"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { Button } from "@/components/ui/button";
import { HABIT_COLORS } from "@/lib/constants";
import { completeSetAction, undoSetAction } from "@/lib/supabase/user-state-actions";
import { playSeriesIncrementSound, playTimerTickSound, warmupAppSound } from "@/lib/sound";
import { cn, formatDurationShort, formatHabitTarget } from "@/lib/utils";
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
  const [celebrate, setCelebrate] = useState(false);
  const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(habit.secondsPerSet ?? 60);
  const [submitting, setSubmitting] = useState(false);
  const lastTickSecondRef = useRef<number | null>(null);

  const swatch = HABIT_COLORS.find((entry) => entry.value === habit.color)?.swatch ?? "#EF4444";
  const isCompleted = progress.isCompleted || variant === "completed";
  const isTimerHabit = habit.trackingMode === "timer";
  const configuredSeconds = habit.secondsPerSet ?? 60;
  const timerRunning = timerDeadline !== null;

  useEffect(() => {
    if (!celebrate) {
      return;
    }

    const timer = window.setTimeout(() => setCelebrate(false), 950);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  useEffect(() => {
    setTimerDeadline(null);
    setRemainingSeconds(configuredSeconds);
    lastTickSecondRef.current = configuredSeconds;
  }, [habit.id, configuredSeconds]);

  useEffect(() => {
    if (!timerDeadline) {
      return;
    }

    if (progress.isCompleted) {
      setTimerDeadline(null);
      setRemainingSeconds(configuredSeconds);
      lastTickSecondRef.current = configuredSeconds;
      return;
    }

    let intervalId = 0;

    const tick = () => {
      const diff = timerDeadline - Date.now();
      if (diff <= 0) {
        window.clearInterval(intervalId);
        setTimerDeadline(null);
        setRemainingSeconds(configuredSeconds);
        lastTickSecondRef.current = configuredSeconds;
        void handleComplete();
        return;
      }

      const nextRemainingSeconds = Math.ceil(diff / 1000);
      if (
        typeof lastTickSecondRef.current === "number" &&
        nextRemainingSeconds !== lastTickSecondRef.current &&
        nextRemainingSeconds < configuredSeconds
      ) {
        playTimerTickSound();
      }

      lastTickSecondRef.current = nextRemainingSeconds;
      setRemainingSeconds(nextRemainingSeconds);
    };

    intervalId = window.setInterval(tick, 250);
    tick();

    return () => window.clearInterval(intervalId);
  }, [configuredSeconds, progress.isCompleted, timerDeadline]);

  const handleComplete = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await warmupAppSound();
      const result = await completeSetAction(habit.id);
      playSeriesIncrementSound();
      if (result.justCompleted) {
        setCelebrate(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (progress.isCompleted || submitting) {
      return;
    }

    await warmupAppSound();

    if (!isTimerHabit) {
      await handleComplete();
      return;
    }

    if (timerRunning) {
      return;
    }

    setRemainingSeconds(configuredSeconds);
    lastTickSecondRef.current = configuredSeconds;
    setTimerDeadline(Date.now() + configuredSeconds * 1000);
  };

  const handleSecondaryAction = async () => {
    if (timerRunning) {
      setTimerDeadline(null);
      setRemainingSeconds(configuredSeconds);
      lastTickSecondRef.current = configuredSeconds;
      return;
    }

    if (submitting || progress.completedSets === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await undoSetAction(habit.id);
    } finally {
      setSubmitting(false);
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
            {habit.name} - {formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {progress.completedSets} / {habit.targetSets} series completadas
          </p>
          {isTimerHabit ? (
            <p className="text-xs text-muted-foreground">
              {timerRunning
                ? `Serie en curso · ${formatDurationShort(remainingSeconds)} restantes`
                : `Cardio por tiempo · ${formatDurationShort(configuredSeconds)} por serie`}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button
            className={cn(
              "h-12 min-w-[8.8rem] rounded-full border px-5 text-sm font-semibold shadow-none",
              isCompleted
                ? "border-border/80 bg-background text-muted-foreground"
                : "border-border/80 bg-surface text-card-foreground hover:bg-background"
            )}
            onClick={() => {
              void handlePrimaryAction();
            }}
            disabled={progress.isCompleted || submitting}
          >
            {isCompleted
              ? "Listo"
              : isTimerHabit
                ? timerRunning
                  ? formatDurationShort(remainingSeconds)
                  : "Iniciar serie"
                : "+ 1"}
          </Button>

          <Button
            variant="ghost"
            className="h-9 rounded-full px-3 text-muted-foreground hover:bg-surface hover:text-card-foreground"
            onClick={() => {
              void handleSecondaryAction();
            }}
            disabled={timerRunning ? false : progress.completedSets === 0 || submitting}
            aria-label={timerRunning ? `Cancelar serie en ${habit.name}` : `Deshacer una serie en ${habit.name}`}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {timerRunning ? "Cancelar" : "Deshacer"}
          </Button>
        </div>
      </div>
    </article>
  );
}
