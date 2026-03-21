"use client";

import Link from "next/link";
import { useState } from "react";
import { PencilLine, Power } from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HABIT_COLOR_STYLES } from "@/lib/constants";
import { toggleHabitActiveAction } from "@/lib/supabase/user-state-actions";
import { formatHabitTarget, formatSelectedDays } from "@/lib/utils";
import type { Habit } from "@/types/habit";

export function HabitCard({ habit }: { habit: Habit }) {
  const [toggling, setToggling] = useState(false);
  const styles = HABIT_COLOR_STYLES[habit.color];

  const handleToggle = async () => {
    setToggling(true);
    try {
      await toggleHabitActiveAction(habit.id);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card className={`border bg-card dark:!border-border dark:bg-[#121922] dark:shadow-[0_14px_32px_rgba(2,8,16,0.34)] ${styles.border}`}>
      <div className="flex items-start justify-between gap-4 text-white">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-card-foreground shadow-sm ring-1 ring-border dark:bg-surface dark:ring-border">
            <HabitIcon icon={habit.icon} />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-lg font-semibold text-white">{habit.name}</h3>
                <Badge
                  className={
                    habit.active
                      ? "bg-accent/12 text-accent ring-1 ring-accent/20 dark:bg-accent/15 dark:text-accent dark:ring-accent/25"
                      : "bg-muted text-slate-900 ring-1 ring-border dark:bg-surface dark:text-white/80 dark:ring-border"
                  }
                >
                  {habit.active ? "Activo" : "Pausado"}
                </Badge>
              </div>
              <p className="text-sm text-white/70">
                {formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)} · {formatSelectedDays(habit.selectedDays)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
              {habit.category ? <span>{habit.category}</span> : null}
              {habit.level ? <span>· {habit.level}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => void handleToggle()} disabled={toggling}>
          <Power className="mr-2 h-4 w-4" />
          {toggling ? "Guardando..." : habit.active ? "Pausar" : "Activar"}
        </Button>
        <Link href={`/habits/${habit.id}/edit`} className={buttonVariants({ variant: "outline", className: "flex-1" })}>
          <PencilLine className="mr-2 h-4 w-4" />
          Editar
        </Link>
      </div>
    </Card>
  );
}
