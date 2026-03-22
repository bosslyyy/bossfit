"use client";

import Link from "next/link";

import { ArrowRight, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitIcon } from "@/components/habits/habit-icon";
import { MemberInboxCard } from "@/components/member/member-inbox-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { formatLongDate, getGreeting } from "@/lib/date";
import { getDashboardSnapshot, getHabitProgress } from "@/lib/habit-logic";
import { getBossProfile } from "@/lib/progress-analytics";
import { formatHabitTarget } from "@/lib/utils";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function DashboardPage() {
  const { habits, completions, locale, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      locale: state.locale,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  const today = new Date();
  const snapshot = getDashboardSnapshot(habits, completions, today, locale);
  const bossProfile = getBossProfile(habits, completions, today, locale);
  const dateLabel = formatLongDate(today, locale);
  const greeting = getGreeting(today, locale);

  const copy = locale === "en"
    ? {
        title: "BossFit",
        description: "Your premium dashboard to train with intent and keep habits without friction.",
        createHabit: "Create habit",
        firstHabitTitle: "Start with your first habit",
        firstHabitDescription:
          "Create a simple routine and BossFit will start tracking your sets, daily progress, and consistency.",
        todayPlan: "Today’s plan",
        scheduledHabits: "scheduled habits",
        openToday: "Open today’s habits",
        currentLevel: "Current level",
        pointsToLevel: `${bossProfile.levelProgress.pointsToNextLevel} pts to level up`,
        seeProgress: "View progress and charts",
        focusToday: "In focus today",
        seeAll: "See all",
        noHabitsToday: "You have no habits today",
        noHabitsTodayDescription: "Use the day to create a new one or reschedule your routines for today.",
        yourHabits: "Your habits",
        newHabit: "New habit"
      }
    : {
        title: "BossFit",
        description: "Tu tablero premium para entrenar con intención y sostener hábitos sin fricción.",
        createHabit: "Crear hábito",
        firstHabitTitle: "Empieza con tu primer hábito",
        firstHabitDescription:
          "Crea una rutina simple y BossFit empezará a seguir tus series, progreso diario y consistencia.",
        todayPlan: "Plan de hoy",
        scheduledHabits: "hábitos programados",
        openToday: "Abrir hábitos de hoy",
        currentLevel: "Nivel actual",
        pointsToLevel: `${bossProfile.levelProgress.pointsToNextLevel} pts para subir`,
        seeProgress: "Ver progreso y gráficas",
        focusToday: "En foco hoy",
        seeAll: "Ver todo",
        noHabitsToday: "No tienes hábitos hoy",
        noHabitsTodayDescription: "Aprovecha para crear uno nuevo o reprogramar tus rutinas para este día.",
        yourHabits: "Tus hábitos",
        newHabit: "Nuevo hábito"
      };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/habits/new" className={buttonVariants({ variant: "primary", size: "icon" })} aria-label={copy.createHabit}>
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <DashboardHero snapshot={snapshot} bossProfile={bossProfile} greeting={greeting} dateLabel={dateLabel} locale={locale} />
      <MemberInboxCard />

      {habits.length === 0 ? (
        <EmptyState
          title={copy.firstHabitTitle}
          description={copy.firstHabitDescription}
          actionLabel={copy.createHabit}
          actionHref="/habits/new"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-muted-foreground">{copy.todayPlan}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-card-foreground">{snapshot.scheduledHabits.length}</p>
              <p className="text-sm text-muted-foreground">{copy.scheduledHabits}</p>
              <Link href="/today" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                {copy.openToday}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">{copy.currentLevel}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-card-foreground">{bossProfile.levelProgress.level}</p>
              <p className="text-sm text-muted-foreground">{copy.pointsToLevel}</p>
              <Link href="/progress" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                {copy.seeProgress}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">{copy.focusToday}</h2>
              <Link href="/today" className="text-sm font-semibold text-accent">
                {copy.seeAll}
              </Link>
            </div>

            {snapshot.scheduledHabits.length ? (
              <div className="space-y-3">
                {snapshot.scheduledHabits.slice(0, 2).map((habit) => {
                  const progress = getHabitProgress(habit, completions, today, locale);
                  return (
                    <Card key={habit.id}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          <HabitIcon icon={habit.icon} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-display text-lg font-semibold text-card-foreground">{habit.name}</h3>
                              <p className="text-sm text-muted-foreground">{formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)}</p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
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
                title={copy.noHabitsToday}
                description={copy.noHabitsTodayDescription}
                actionLabel={copy.createHabit}
                actionHref="/habits/new"
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">{copy.yourHabits}</h2>
              <Link href="/habits/new" className={buttonVariants({ variant: "secondary" })}>
                {copy.newHabit}
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
