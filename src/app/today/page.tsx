"use client";

import { useShallow } from "zustand/react/shallow";

import { TodayHabitCard } from "@/components/habits/today-habit-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { formatLongDate } from "@/lib/date";
import { getDashboardSnapshot, getHabitProgress } from "@/lib/habit-logic";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function TodayPage() {
  const { habits, completions, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen title="Preparando tu plan de hoy..." />;
  }

  const today = new Date();
  const snapshot = getDashboardSnapshot(habits, completions, today);

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Hábitos de hoy"
        description="Marca una serie por vez y BossFit actualizará al instante lo que te falta."
      />

      <Card className="border-none bg-[#11161D] text-white">
        <div className="space-y-3">
          <p className="text-sm text-white/65">{formatLongDate(today)}</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl font-semibold">{snapshot.completionPercentage}%</p>
              <p className="text-sm text-white/65">avance del día</p>
            </div>
            <div className="text-right text-sm text-white/70">
              <p>{snapshot.completedHabits} completados</p>
              <p>{snapshot.pendingHabits} pendientes</p>
            </div>
          </div>
        </div>
      </Card>

      {!habits.length ? (
        <EmptyState
          title="Aún no tienes hábitos"
          description="Crea tu primera rutina para empezar a marcar series y construir tu progreso diario."
          actionLabel="Crear hábito"
          actionHref="/habits/new"
        />
      ) : !snapshot.scheduledHabits.length ? (
        <EmptyState
          title="Hoy no hay hábitos programados"
          description="Puedes descansar, reprogramar una rutina o crear un hábito flexible para todos los días."
          actionLabel="Crear hábito"
          actionHref="/habits/new"
        />
      ) : (
        <div className="space-y-4">
          {snapshot.scheduledHabits.map((habit) => (
            <TodayHabitCard key={habit.id} habit={habit} progress={getHabitProgress(habit, completions, today)} />
          ))}
        </div>
      )}
    </div>
  );
}
