"use client";

import Link from "next/link";
import { useState } from "react";

import { BarChart3, ChevronDown, Settings2, Sparkles, Target } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { TodayHabitCard } from "@/components/habits/today-habit-card";
import { buttonVariants } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { addDays, formatLongDate, getWeekdayKey, toDateKey } from "@/lib/date";
import { getWeekDays } from "@/lib/i18n";
import { getDashboardSnapshot, getHabitProgress } from "@/lib/habit-logic";
import { getBossProfile } from "@/lib/progress-analytics";
import { cn } from "@/lib/utils";
import { useBossFitStore } from "@/store/use-bossfit-store";

type FilterKey = "all" | "pending" | "completed";

function getTodayHeadline(total: number, completed: number, locale: "es" | "en") {
  if (!total) {
    return locale === "en"
      ? {
          title: "Active recovery",
          emoji: "🌙",
          subtitle: "There are no scheduled loads for today."
        }
      : {
          title: "Recuperación activa",
          emoji: "🌙",
          subtitle: "No hay cargas programadas para hoy."
        };
  }

  if (completed === total) {
    return locale === "en"
      ? {
          title: "Day closed",
          emoji: "✅",
          subtitle: "Your whole block for today is already marked."
        }
      : {
          title: "Día cerrado",
          emoji: "✅",
          subtitle: "Todo tu bloque de hoy ya quedó marcado."
        };
  }

  return locale === "en"
    ? {
        title: "Focus of the day",
        emoji: "🔥",
        subtitle: "Mark a set, keep the pace, and close your daily block."
      }
    : {
        title: "Enfoque del día",
        emoji: "🔥",
        subtitle: "Marca una serie, mantén el ritmo y cierra tu bloque diario."
      };
}

function getDateRail(anchor: Date) {
  return Array.from({ length: 5 }, (_, index) => addDays(anchor, index - 4));
}

function getDateChipLabel(date: Date, locale: "es" | "en") {
  const weekday = getWeekDays(locale).find((day) => day.key === getWeekdayKey(date))?.label.slice(0, 3).toLowerCase() ?? "";
  return `${weekday} ${date.getDate()}`;
}

export default function TodayPage() {
  const { habits, completions, locale, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      locale: state.locale,
      hasHydrated: state.hasHydrated
    }))
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [completedOpen, setCompletedOpen] = useState(true);

  if (!hasHydrated) {
    return <LoadingScreen title={locale === "en" ? "Preparing today’s plan..." : "Preparando tu plan de hoy..."} />;
  }

  const selectedDate = new Date();
  const snapshot = getDashboardSnapshot(habits, completions, selectedDate, locale);
  const bossProfile = getBossProfile(habits, completions, selectedDate, locale);
  const headline = getTodayHeadline(snapshot.scheduledHabits.length, snapshot.completedHabits, locale);
  const dateRail = getDateRail(selectedDate);

  const scheduledEntries = snapshot.scheduledHabits.map((habit) => ({
    habit,
    progress: getHabitProgress(habit, completions, selectedDate, locale)
  }));
  const pendingEntries = scheduledEntries.filter((entry) => !entry.progress.isCompleted);
  const completedEntries = scheduledEntries.filter((entry) => entry.progress.isCompleted);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = locale === "en"
    ? [
        { key: "all", label: "All habits", count: scheduledEntries.length },
        { key: "pending", label: "In progress", count: pendingEntries.length },
        { key: "completed", label: "Completed", count: completedEntries.length }
      ]
    : [
        { key: "all", label: "Todos los hábitos", count: scheduledEntries.length },
        { key: "pending", label: "En curso", count: pendingEntries.length },
        { key: "completed", label: "Completados", count: completedEntries.length }
      ];

  const visiblePending = filter === "completed" ? [] : pendingEntries;
  const visibleCompleted = filter === "pending" ? [] : completedEntries;

  const copy = locale === "en"
    ? {
        heading: "TODAY",
        openProgress: "Open progress",
        openSettings: "Open settings",
        pointsToday: `${bossProfile.todayPoints} Boss Points today`,
        completed: `${snapshot.completedHabits} completed`,
        streak: `streak ${bossProfile.currentStreak}`,
        createFirstTitle: "Create your first habit",
        createFirstDescription: "Define a simple block and BossFit will turn this view into your main daily session.",
        createHabit: "Create habit",
        noneScheduledTitle: "No habits scheduled",
        noneScheduledDescription: "You can keep the day light or create a flexible habit to hold the pace during the week.",
        emptyFilter: "There are no active habits in this filter.",
        completedTitle: `${completedEntries.length} completed`,
        noCompleted: "You do not have completed habits in this view yet."
      }
    : {
        heading: "HOY",
        openProgress: "Abrir progreso",
        openSettings: "Abrir ajustes",
        pointsToday: `${bossProfile.todayPoints} Boss Points hoy`,
        completed: `${snapshot.completedHabits} completados`,
        streak: `racha ${bossProfile.currentStreak}`,
        createFirstTitle: "Crea tu primer hábito",
        createFirstDescription: "Define un bloque simple y BossFit convertirá esta vista en tu sesión diaria principal.",
        createHabit: "Crear hábito",
        noneScheduledTitle: "No hay hábitos programados",
        noneScheduledDescription: "Puedes dejar el día liviano o crear un hábito flexible para mantener el ritmo durante la semana.",
        emptyFilter: "No hay hábitos activos en este filtro.",
        completedTitle: `${completedEntries.length} completados`,
        noCompleted: "Todavía no tienes hábitos completados en esta vista."
      };

  return (
    <div className="space-y-6 animate-rise">
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.heading}</p>
            <div className="space-y-2">
              <h1 className="font-display text-[clamp(2.4rem,10vw,4rem)] font-semibold leading-[0.94] text-card-foreground">
                <span className="mr-2">{headline.emoji}</span>
                {headline.title}
              </h1>
              <p className="text-sm text-muted-foreground">{formatLongDate(selectedDate, locale)}</p>
              <p className="max-w-[20rem] text-sm leading-6 text-muted-foreground">{headline.subtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 pt-1">
            <Link href="/progress" aria-label={copy.openProgress} className={actionCircleClass}>
              <BarChart3 className="h-5 w-5" />
            </Link>
            <Link href="/settings" aria-label={copy.openSettings} className={actionCircleClass}>
              <Settings2 className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-3 pb-1">
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-5 py-4 text-base font-semibold transition active:scale-[0.98]",
                    active
                      ? "bg-[#4E7DFF] text-white shadow-[0_18px_36px_rgba(78,125,255,0.34)]"
                      : "border border-border/70 bg-card/90 text-muted-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs", active ? "bg-white/14 text-white" : "bg-background text-card-foreground")}>{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-[#4E7DFF]" />
          <span>{copy.pointsToday}</span>
          <span className="opacity-50">·</span>
          <span>{copy.completed}</span>
          <span className="opacity-50">·</span>
          <span>{copy.streak}</span>
        </div>
      </section>

      {!habits.length ? (
        <div className="rounded-[30px] border border-border/70 bg-card/96 p-5 shadow-[0_24px_60px_rgba(2,8,16,0.14)]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#4E7DFF]/18 bg-[#4E7DFF]/12 text-[#4E7DFF]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-card-foreground">{copy.createFirstTitle}</h2>
              <p className="max-w-[22rem] text-sm leading-6 text-muted-foreground">
                {copy.createFirstDescription}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Link href="/habits/new" className={buttonVariants({ className: "rounded-full bg-[#4E7DFF] px-5 text-white hover:bg-[#5F8BFF]" })}>
              {copy.createHabit}
            </Link>
          </div>
        </div>
      ) : !snapshot.scheduledHabits.length ? (
        <div className="rounded-[30px] border border-border/70 bg-card/96 p-5 shadow-[0_24px_60px_rgba(2,8,16,0.14)]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-success/18 bg-success/12 text-success">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-card-foreground">{copy.noneScheduledTitle}</h2>
              <p className="max-w-[22rem] text-sm leading-6 text-muted-foreground">
                {copy.noneScheduledDescription}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Link href="/habits/new" className={buttonVariants({ className: "rounded-full bg-[#4E7DFF] px-5 text-white hover:bg-[#5F8BFF]" })}>
              {copy.createHabit}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={cn(listPanelClass, "divide-y divide-border/70")}>
            {visiblePending.length ? (
              visiblePending.map((entry) => (
                <TodayHabitCard key={entry.habit.id} habit={entry.habit} progress={entry.progress} variant="active" />
              ))
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">{copy.emptyFilter}</div>
            )}
          </div>

          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setCompletedOpen((value) => !value)}
              className="flex w-full items-center justify-between px-1 text-left"
            >
              <div>
                <h2 className="font-display text-[2rem] font-semibold leading-none text-card-foreground">
                  {copy.completedTitle}
                </h2>
              </div>
              <ChevronDown className={cn("h-6 w-6 text-card-foreground transition", completedOpen && "rotate-180")} />
            </button>

            {completedOpen && visibleCompleted.length ? (
              <div className={cn(listPanelClass, "divide-y divide-border/70 bg-surface/82")}>
                {visibleCompleted.map((entry) => (
                  <TodayHabitCard key={entry.habit.id} habit={entry.habit} progress={entry.progress} variant="completed" />
                ))}
              </div>
            ) : completedOpen ? (
              <div className="rounded-[26px] border border-border/70 bg-card/92 px-5 py-4 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(2,8,16,0.12)]">
                {copy.noCompleted}
              </div>
            ) : null}
          </section>

          <section className="space-y-3 pt-1">
            <div className="rounded-[28px] border border-border/70 bg-card/96 p-2 shadow-[0_22px_48px_rgba(2,8,16,0.14)]">
              <div className="grid grid-cols-5 gap-2">
                {dateRail.map((date) => {
                  const selected = toDateKey(date) === toDateKey(selectedDate);
                  return (
                    <div
                      key={toDateKey(date)}
                      className={cn(
                        "rounded-[22px] px-2 py-4 text-center transition",
                        selected ? "bg-background text-card-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"
                      )}
                    >
                      <p className="text-sm font-semibold">{getDateChipLabel(date, locale)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const actionCircleClass =
  "flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-card/94 text-card-foreground shadow-[0_14px_30px_rgba(2,8,16,0.12)] transition hover:border-[#4E7DFF]/32 hover:text-[#4E7DFF] active:scale-[0.98]";
const listPanelClass =
  "overflow-hidden rounded-[30px] border border-border/70 bg-card/96 shadow-[0_26px_60px_rgba(2,8,16,0.16)]";
