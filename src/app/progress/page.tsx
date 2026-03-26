"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { ActivityChartCard } from "@/components/progress/activity-chart-card";
import { HabitHistoryCard } from "@/components/progress/habit-history-card";
import { MonthlyCalendar } from "@/components/progress/monthly-calendar";
import { WeeklySummaryCard } from "@/components/progress/weekly-summary-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getHabitHistory } from "@/lib/habit-logic";
import {
  getBossProfile,
  getChartData,
  getMonthlyCalendarDays,
  getMonthlyHeadline,
  getWeeklySummaryFromTimeline
} from "@/lib/progress-analytics";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function ProgressPage() {
  const { habits, completions, locale, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      locale: state.locale,
      hasHydrated: state.hasHydrated
    }))
  );
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  if (!hasHydrated) {
    return <LoadingScreen title={locale === "en" ? "Calculating your progress..." : "Calculando tu progreso..."} />;
  }

  const today = new Date();
  const summary = getWeeklySummaryFromTimeline(habits, completions, today, locale);
  const bossProfile = getBossProfile(habits, completions, today, locale);
  const chartData = getChartData(habits, completions, 7, today, locale);
  const calendarDays = getMonthlyCalendarDays(habits, completions, monthAnchor, today, locale);
  const monthLabel = getMonthlyHeadline(monthAnchor, locale);

  const copy = locale === "en"
    ? {
        title: "Progress",
        description: "Real streaks, completion calendar, Boss Points, and recent activity to see your full consistency.",
        emptyTitle: "Your progress will appear here",
        emptyDescription: "Once you have exercises and start completing sets, BossFit will build your stats.",
        createHabit: "Create exercise",
        bossLevel: "Boss Level",
        levelSubtitle: `Level ${bossProfile.levelProgress.level} · ${bossProfile.levelProgress.title}`,
        totalPoints: "Total Boss Points",
        historyTitle: "History by exercise"
      }
    : {
        title: "Progreso",
        description: "Rachas reales, calendario de cumplimiento, Boss Points y actividad reciente para ver tu constancia completa.",
        emptyTitle: "Tu progreso aparecerá aquí",
        emptyDescription: "Cuando tengas ejercicios y empieces a completar series, BossFit construirá tus estadísticas.",
        createHabit: "Crear ejercicio",
        bossLevel: "Boss Level",
        levelSubtitle: `Nivel ${bossProfile.levelProgress.level} · ${bossProfile.levelProgress.title}`,
        totalPoints: "Boss Points totales",
        historyTitle: "Historial por ejercicio"
      };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader title={copy.title} description={copy.description} />

      {!habits.length ? (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          actionLabel={copy.createHabit}
          actionHref="/habits/new"
        />
      ) : (
        <>
          <WeeklySummaryCard summary={summary} locale={locale} />

          <ActivityChartCard data={chartData} locale={locale} />

          <MonthlyCalendar
            monthLabel={monthLabel}
            days={calendarDays}
            locale={locale}
            onPreviousMonth={() =>
              setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12, 0, 0, 0))
            }
            onNextMonth={() =>
              setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12, 0, 0, 0))
            }
          />

          <section className="space-y-3">
            <div className="space-y-4 rounded-[24px] border border-border bg-card px-4 py-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-card-foreground">{copy.bossLevel}</h2>
                  <p className="text-sm text-muted-foreground">{copy.levelSubtitle}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold text-card-foreground">{bossProfile.totalPoints}</p>
                  <p className="text-sm text-muted-foreground">{copy.totalPoints}</p>
                </div>
              </div>
              <ProgressBar value={bossProfile.levelProgress.progressPercentage} />
              <p className="text-sm text-muted-foreground">{bossProfile.levelProgress.message}</p>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">{copy.historyTitle}</h2>
              <div className="space-y-3">
                {habits.map((habit) => (
                  <HabitHistoryCard key={habit.id} habit={habit} history={getHabitHistory(habit, completions, 7, today, locale)} locale={locale} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

