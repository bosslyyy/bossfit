import { Flame, Sparkles, Target, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { WeeklySummary } from "@/types/habit";

export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const stats = [
    { label: "Racha", value: `${summary.streak}`, hint: "días", icon: Flame },
    { label: "Cumplimiento", value: `${summary.compliance}%`, hint: "esta semana", icon: TrendingUp },
    { label: "Hábitos completos", value: `${summary.completedHabitDays}`, hint: `de ${summary.scheduledHabitDays}`, icon: Target },
    { label: "Boss Points", value: `${summary.totalPoints}`, hint: "reps convertidas", icon: Sparkles }
  ];

  return (
    <Card className="overflow-hidden border-none bg-[#11161D] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,164,126,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,158,77,0.18),transparent_32%)]" />
      <div className="relative space-y-5">
        <div>
          <p className="text-sm text-white/65">Resumen de la semana</p>
          <h2 className="font-display text-2xl font-semibold">Tu consistencia en números</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-[24px] bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-white/70">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{stat.label}</span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold">{stat.value}</p>
                <p className="text-xs text-white/55">{stat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
