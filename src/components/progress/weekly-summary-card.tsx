import { Flame, Sparkles, Target, Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { AppLocale, WeeklySummary } from "@/types/habit";

export function WeeklySummaryCard({ summary, locale }: { summary: WeeklySummary; locale: AppLocale }) {
  const copy = locale === "en"
    ? {
        section: "Week summary",
        title: "Your consistency in numbers",
        currentStreak: "Current streak",
        currentHint: "days in a row",
        bestStreak: "Best streak",
        bestHint: "personal record",
        compliance: "Compliance",
        complianceHint: "this week",
        points: "Boss Points",
        pointsHint: "earned this week"
      }
    : {
        section: "Resumen de la semana",
        title: "Tu consistencia en números",
        currentStreak: "Racha actual",
        currentHint: "días seguidos",
        bestStreak: "Mejor racha",
        bestHint: "récord histórico",
        compliance: "Cumplimiento",
        complianceHint: "esta semana",
        points: "Boss Points",
        pointsHint: "ganados esta semana"
      };

  const stats = [
    { label: copy.currentStreak, value: `${summary.streak}`, hint: copy.currentHint, icon: Flame },
    { label: copy.bestStreak, value: `${summary.bestStreak}`, hint: copy.bestHint, icon: Trophy },
    { label: copy.compliance, value: `${summary.compliance}%`, hint: copy.complianceHint, icon: Target },
    { label: copy.points, value: `${summary.totalPoints}`, hint: copy.pointsHint, icon: Sparkles }
  ];

  return (
    <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-soft dark:bg-[#121922] dark:text-white dark:shadow-[0_24px_60px_rgba(2,8,16,0.38)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,164,126,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,158,77,0.12),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(36,164,126,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,158,77,0.16),transparent_32%)]" />
      <div className="relative space-y-5">
        <div>
          <p className="text-sm text-muted-foreground dark:text-white/65">{copy.section}</p>
          <h2 className="font-display text-2xl font-semibold text-card-foreground dark:text-white">
            {copy.title}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{stat.label}</span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-card-foreground dark:text-white">{stat.value}</p>
                <p className="text-xs text-muted-foreground dark:text-white/60">{stat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
