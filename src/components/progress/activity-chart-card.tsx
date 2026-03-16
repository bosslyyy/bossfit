import { BarChart3, Sparkles, TrendingUp } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn, safePercentage } from "@/lib/utils";
import type { ProgressChartPoint } from "@/types/habit";

function getBarClassName(status: ProgressChartPoint["status"]) {
  if (status === "complete") {
    return "bg-gradient-to-t from-accent to-success";
  }

  if (status === "partial") {
    return "bg-gradient-to-t from-[#F6B21A] to-[#FFCF70]";
  }

  if (status === "missed") {
    return "bg-gradient-to-t from-muted-foreground/70 to-muted-foreground/40";
  }

  return "bg-gradient-to-t from-border to-muted";
}

export function ActivityChartCard({ data }: { data: ProgressChartPoint[] }) {
  const maxPoints = Math.max(...data.map((entry) => entry.points), 10);
  const totalPoints = data.reduce((total, entry) => total + entry.points, 0);
  const totalCompletedHabits = data.reduce((total, entry) => total + entry.completedHabits, 0);
  const totalScheduledHabits = data.reduce((total, entry) => total + entry.scheduledHabits, 0);
  const averageCompliance = safePercentage(
    data.reduce((total, entry) => total + entry.percentage, 0),
    data.length * 100
  );

  return (
    <Card>
      <div className="space-y-5">
        <div>
          <CardTitle>Actividad de los últimos 7 días</CardTitle>
          <CardDescription>Boss Points y cumplimiento diario en una vista rápida y móvil.</CardDescription>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Puntos</span>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-card-foreground">{totalPoints}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Cumplimiento</span>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-card-foreground">{averageCompliance}%</p>
          </div>
          <div className="rounded-[22px] border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Hábitos</span>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-card-foreground">
              {totalCompletedHabits}/{totalScheduledHabits || 0}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-surface px-3 py-4">
          <div className="grid grid-cols-7 items-end gap-3">
            {data.map((entry) => {
              const barHeight = Math.max((entry.points / maxPoints) * 100, entry.points > 0 ? 16 : 8);

              return (
                <div key={entry.date} className="flex flex-col items-center gap-2 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground">{entry.points}</span>
                  <div className="flex h-36 w-full items-end justify-center rounded-[18px] bg-background px-2 py-2 ring-1 ring-border/70">
                    <div
                      className={cn("w-full rounded-[12px] transition-all duration-300", getBarClassName(entry.status))}
                      style={{ height: `${barHeight}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-card-foreground">{entry.shortLabel}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Promedio semanal</span>
            <span>{averageCompliance}%</span>
          </div>
          <ProgressBar value={averageCompliance} />
        </div>
      </div>
    </Card>
  );
}
