import { Flame, Sparkles, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { AppLocale, BossProfile, DashboardSnapshot } from "@/types/habit";

export function DashboardHero({
  snapshot,
  bossProfile,
  greeting,
  dateLabel,
  locale
}: {
  snapshot: DashboardSnapshot;
  bossProfile: BossProfile;
  greeting: string;
  dateLabel: string;
  locale: AppLocale;
}) {
  const copy = locale === "en"
    ? {
        greetingSuffix: "Boss",
        headline: "Today you build discipline.",
        dayProgress: "Today’s progress",
        habitsLabel: `${snapshot.completedHabits}/${snapshot.scheduledHabits.length || 0} exercises`,
        pointsToday: `+${bossProfile.todayPoints} Boss Points today`,
        currentStreak: "Current streak",
        currentStreakHint: "days in a row",
        bestStreak: "Best streak",
        bestStreakHint: "personal record",
        points: "Boss Points",
        level: `Level ${bossProfile.levelProgress.level}`,
        nextLevel: `${bossProfile.levelProgress.pointsToNextLevel} pts to next level`,
        pending: `${snapshot.pendingHabits} pending`,
        activeHabits: `${snapshot.activeHabits} active exercises`
      }
    : {
        greetingSuffix: "Boss",
        headline: "Hoy construyes disciplina.",
        dayProgress: "Progreso del día",
        habitsLabel: `${snapshot.completedHabits}/${snapshot.scheduledHabits.length || 0} ejercicios`,
        pointsToday: `+${bossProfile.todayPoints} Boss Points hoy`,
        currentStreak: "Racha actual",
        currentStreakHint: "días seguidos cerrados",
        bestStreak: "Mejor racha",
        bestStreakHint: "récord histórico",
        points: "Boss Points",
        level: `Nivel ${bossProfile.levelProgress.level}`,
        nextLevel: `${bossProfile.levelProgress.pointsToNextLevel} pts para el siguiente nivel`,
        pending: `${snapshot.pendingHabits} pendientes`,
        activeHabits: `${snapshot.activeHabits} ejercicios activos`
      };

  return (
    <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-soft dark:bg-[#121922] dark:text-white dark:shadow-[0_24px_60px_rgba(2,8,16,0.42)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,124,34,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,124,89,0.08),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(244,124,34,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(36,164,126,0.14),transparent_35%)]" />
      <div className="relative space-y-6">
        <div className="space-y-3">
          <Badge className="bg-background/96 text-muted-foreground ring-1 ring-border dark:bg-white/10 dark:text-white/75 dark:ring-white/10">
            {dateLabel}
          </Badge>
          <div>
            <p className="text-sm text-muted-foreground dark:text-white/70">{greeting}, {copy.greetingSuffix}</p>
            <h2 className="font-display text-3xl font-semibold leading-none text-card-foreground dark:text-white">
              {copy.headline}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr,0.9fr] gap-4">
          <div className="space-y-3 rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
            <p className="text-sm text-muted-foreground dark:text-white/70">{copy.dayProgress}</p>
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-semibold text-card-foreground dark:text-white">
                {snapshot.completionPercentage}%
              </span>
              <span className="pb-2 text-sm text-muted-foreground dark:text-white/60">
                {copy.habitsLabel}
              </span>
            </div>
            <ProgressBar
              value={snapshot.completionPercentage}
              className="bg-border/55 dark:bg-white/10"
              indicatorClassName="bg-gradient-to-r from-[#FF9E4D] to-[#24A47E]"
            />
            <p className="text-sm text-muted-foreground dark:text-white/65">{copy.pointsToday}</p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                <Flame className="h-4 w-4" />
                <span className="text-sm">{copy.currentStreak}</span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-card-foreground dark:text-white">
                {bossProfile.currentStreak}
              </p>
              <p className="text-xs text-muted-foreground dark:text-white/60">{copy.currentStreakHint}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                <Trophy className="h-4 w-4" />
                <span className="text-sm">{copy.bestStreak}</span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-card-foreground dark:text-white">
                {bossProfile.bestStreak}
              </p>
              <p className="text-xs text-muted-foreground dark:text-white/60">{copy.bestStreakHint}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-border bg-background/96 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">{copy.points}</span>
            </div>
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20 dark:bg-accent/20 dark:text-accent-foreground dark:ring-accent/20">
              {copy.level}
            </Badge>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl font-semibold text-card-foreground dark:text-white">
                {bossProfile.totalPoints}
              </p>
              <p className="text-sm text-muted-foreground dark:text-white/65">{bossProfile.levelProgress.title}</p>
            </div>
            <p className="max-w-[11rem] text-right text-xs text-muted-foreground dark:text-white/60">
              {copy.nextLevel}
            </p>
          </div>
          <ProgressBar value={bossProfile.levelProgress.progressPercentage} className="bg-border/55 dark:bg-white/10" />
          <p className="text-sm text-muted-foreground dark:text-white/70">{bossProfile.levelProgress.message}</p>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-border bg-background/96 px-4 py-3 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>{copy.pending}</span>
          </div>
          <span>{copy.activeHabits}</span>
        </div>
      </div>
    </Card>
  );
}

