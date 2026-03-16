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
  const { habits, completions, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      hasHydrated: state.hasHydrated
    }))
  );
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  if (!hasHydrated) {
    return <LoadingScreen title="Calculando tu progreso..." />;
  }

  const today = new Date();
  const summary = getWeeklySummaryFromTimeline(habits, completions, today);
  const bossProfile = getBossProfile(habits, completions, today);
  const chartData = getChartData(habits, completions, 7, today);
  const calendarDays = getMonthlyCalendarDays(habits, completions, monthAnchor, today);
  const monthLabel = getMonthlyHeadline(monthAnchor);

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Progreso"
        description="Rachas reales, calendario de cumplimiento, Boss Points y actividad reciente para ver tu constancia completa."
      />

      {!habits.length ? (
        <EmptyState
          title="Tu progreso aparecerá aquí"
          description="Cuando tengas hábitos y empieces a completar series, BossFit construirá tus estadísticas."
          actionLabel="Crear hábito"
          actionHref="/habits/new"
        />
      ) : (
        <>
          <WeeklySummaryCard summary={summary} />

          <ActivityChartCard data={chartData} />

          <MonthlyCalendar
            monthLabel={monthLabel}
            days={calendarDays}
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
                  <h2 className="font-display text-xl font-semibold text-card-foreground">Boss Level</h2>
                  <p className="text-sm text-muted-foreground">
                    Nivel {bossProfile.levelProgress.level} · {bossProfile.levelProgress.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold text-card-foreground">{bossProfile.totalPoints}</p>
                  <p className="text-sm text-muted-foreground">Boss Points totales</p>
                </div>
              </div>
              <ProgressBar value={bossProfile.levelProgress.progressPercentage} />
              <p className="text-sm text-muted-foreground">{bossProfile.levelProgress.message}</p>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">Historial por hábito</h2>
              <div className="space-y-3">
                {habits.map((habit) => (
                  <HabitHistoryCard key={habit.id} habit={habit} history={getHabitHistory(habit, completions, 7, today)} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
