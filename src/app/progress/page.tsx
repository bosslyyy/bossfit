"use client";

import { useShallow } from "zustand/react/shallow";

import { HabitHistoryCard } from "@/components/progress/habit-history-card";
import { WeeklySummaryCard } from "@/components/progress/weekly-summary-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { getCompletionCalendar, getHabitHistory, getWeeklySummary } from "@/lib/habit-logic";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function ProgressPage() {
  const { habits, completions, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen title="Calculando tu progreso..." />;
  }

  const today = new Date();
  const summary = getWeeklySummary(habits, completions, today);
  const completionCalendar = getCompletionCalendar(habits, completions, 7, today);

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Progreso"
        description="Rachas, cumplimiento y un historial simple por hábito para ver tu constancia real."
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

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Semana actual</h2>
                <p className="text-sm text-foreground/60">Un vistazo rápido a tu consistencia diaria.</p>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {completionCalendar.map((entry) => (
                  <div key={entry.date} className="space-y-2 text-center">
                    <span className="block text-[11px] font-semibold text-foreground/45">{entry.shortLabel}</span>
                    <div className="rounded-2xl bg-black/5 px-2 py-3 dark:bg-white/5">
                      <p className="font-display text-lg font-semibold text-foreground">{entry.percentage}%</p>
                      <p className="text-[11px] text-foreground/55">{entry.completed}/{entry.scheduled || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">Historial por hábito</h2>
            <div className="space-y-3">
              {habits.map((habit) => (
                <HabitHistoryCard key={habit.id} habit={habit} history={getHabitHistory(habit, completions, 7, today)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
