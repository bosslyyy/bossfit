import { Flame, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardSnapshot } from "@/types/habit";

export function DashboardHero({
  snapshot,
  greeting,
  dateLabel
}: {
  snapshot: DashboardSnapshot;
  greeting: string;
  dateLabel: string;
}) {
  return (
    <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-soft dark:bg-[#121922] dark:text-white dark:shadow-[0_24px_60px_rgba(2,8,16,0.42)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,124,34,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,124,89,0.08),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(244,124,34,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(36,164,126,0.14),transparent_35%)]" />
      <div className="relative space-y-6">
        <div className="space-y-3">
          <Badge className="bg-background/96 text-muted-foreground ring-1 ring-border dark:bg-white/10 dark:text-white/75 dark:ring-white/10">
            {dateLabel}
          </Badge>
          <div>
            <p className="text-sm text-muted-foreground dark:text-white/70">{greeting}, Boss</p>
            <h2 className="font-display text-3xl font-semibold leading-none text-card-foreground dark:text-white">
              Hoy construyes disciplina.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr,0.9fr] gap-4">
          <div className="space-y-3 rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
            <p className="text-sm text-muted-foreground dark:text-white/70">Progreso del día</p>
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-semibold text-card-foreground dark:text-white">
                {snapshot.completionPercentage}%
              </span>
              <span className="pb-2 text-sm text-muted-foreground dark:text-white/60">
                {snapshot.completedHabits}/{snapshot.scheduledHabits.length || 0} hábitos
              </span>
            </div>
            <ProgressBar
              value={snapshot.completionPercentage}
              className="bg-border/55 dark:bg-white/10"
              indicatorClassName="bg-gradient-to-r from-[#FF9E4D] to-[#24A47E]"
            />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                <Flame className="h-4 w-4" />
                <span className="text-sm">Racha</span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-card-foreground dark:text-white">
                {snapshot.streak}
              </p>
              <p className="text-xs text-muted-foreground dark:text-white/60">días consecutivos</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">Boss Points</span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-card-foreground dark:text-white">
                {snapshot.totalPoints}
              </p>
              <p className="text-xs text-muted-foreground dark:text-white/60">reps convertidas hoy</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-border bg-background/96 px-4 py-3 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>{snapshot.pendingHabits} pendientes</span>
          </div>
          <span>{snapshot.activeHabits} hábitos activos</span>
        </div>
      </div>
    </Card>
  );
}
