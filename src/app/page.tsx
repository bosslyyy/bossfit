"use client";

import Link from "next/link";

import { ArrowRight, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitIcon } from "@/components/habits/habit-icon";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { formatLongDate, getGreeting } from "@/lib/date";
import { getDashboardSnapshot, getHabitProgress } from "@/lib/habit-logic";
import { formatHabitTarget } from "@/lib/utils";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function DashboardPage() {
  const { habits, completions, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  const today = new Date();
  const snapshot = getDashboardSnapshot(habits, completions, today);
  const dateLabel = formatLongDate(today);
  const greeting = getGreeting(today);

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="BossFit"
        description="Tu tablero premium para entrenar con intención y sostener hábitos sin fricción."
        action={
          <Link href="/habits/new" className={buttonVariants({ variant: "primary", size: "icon" })} aria-label="Crear hábito">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <DashboardHero snapshot={snapshot} greeting={greeting} dateLabel={dateLabel} />

      {habits.length === 0 ? (
        <EmptyState
          title="Empieza con tu primer hábito"
          description="Crea una rutina simple y BossFit empezará a seguir tus series, progreso diario y consistencia."
          actionLabel="Crear hábito"
          actionHref="/habits/new"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-foreground/60">Plan de hoy</p>
              <p className="mt-2 font-display text-3xl font-semibold text-foreground">{snapshot.scheduledHabits.length}</p>
              <p className="text-sm text-foreground/65">hábitos programados</p>
              <Link href="/today" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Abrir hábitos de hoy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
            <Card>
              <p className="text-sm text-foreground/60">Pendientes</p>
              <p className="mt-2 font-display text-3xl font-semibold text-foreground">{snapshot.pendingHabits}</p>
              <p className="text-sm text-foreground/65">por cerrar antes de terminar el día</p>
              <Link href="/progress" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Ver estadísticas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">En foco hoy</h2>
              <Link href="/today" className="text-sm font-semibold text-accent">
                Ver todo
              </Link>
            </div>

            {snapshot.scheduledHabits.length ? (
              <div className="space-y-3">
                {snapshot.scheduledHabits.slice(0, 2).map((habit) => {
                  const progress = getHabitProgress(habit, completions, today);
                  return (
                    <Card key={habit.id}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          <HabitIcon icon={habit.icon} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-display text-lg font-semibold text-foreground">{habit.name}</h3>
                              <p className="text-sm text-foreground/60">{formatHabitTarget(habit.targetSets, habit.repsPerSet)}</p>
                            </div>
                            <div className="text-right text-sm text-foreground/60">
                              <p>{progress.completedSets}/{habit.targetSets}</p>
                              <p>{progress.statusMessage}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No tienes hábitos hoy"
                description="Aprovecha para crear uno nuevo o reprogramar tus rutinas para este día."
                actionLabel="Crear hábito"
                actionHref="/habits/new"
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">Tus hábitos</h2>
              <Link href="/habits/new" className={buttonVariants({ variant: "secondary" })}>
                Nuevo hábito
              </Link>
            </div>
            <div className="space-y-3">
              {habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
