import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getWeekDays } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AppLocale, CalendarDay } from "@/types/habit";

const statusStyles: Record<CalendarDay["status"], string> = {
  complete:
    "border-transparent bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20 dark:ring-accent/25",
  partial:
    "border-transparent bg-[#FFF3E3] text-[#A56612] shadow-sm ring-1 ring-[#F6B21A]/25 dark:bg-[#3C2A12] dark:text-[#F8C35B] dark:ring-[#F6B21A]/20",
  missed: "border-border bg-muted text-muted-foreground",
  none: "border-border/70 bg-background text-muted-foreground"
};

export function MonthlyCalendar({
  monthLabel,
  days,
  onPreviousMonth,
  onNextMonth,
  locale
}: {
  monthLabel: string;
  days: CalendarDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  locale: AppLocale;
}) {
  const weekDays = getWeekDays(locale);
  const copy = locale === "en"
    ? {
        title: "Progress calendar",
        description: "Quickly spot complete, partial, or empty days.",
        previousMonth: "Previous month",
        nextMonth: "Next month",
        complete: "Complete",
        partial: "Partial",
        missed: "Missed",
        habits: "habits",
        closed: "Closed",
        inProgress: "In progress",
        pending: "Pending",
        upcoming: "Upcoming",
        none: "No habits"
      }
    : {
        title: "Calendario de progreso",
        description: "Detecta rápido tus días completos, parciales o sin carga.",
        previousMonth: "Mes anterior",
        nextMonth: "Mes siguiente",
        complete: "Completo",
        partial: "Parcial",
        missed: "Incompleto",
        habits: "ejercicios",
        closed: "Cerrado",
        inProgress: "En curso",
        pending: "Pendiente",
        upcoming: "Próximo",
        none: "Sin ejercicios"
      };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={onPreviousMonth} aria-label={copy.previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={onNextMonth} aria-label={copy.nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface px-4 py-3">
          <p className="font-display text-lg font-semibold text-card-foreground">{monthLabel}</p>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> {copy.complete}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F6B21A]" /> {copy.partial}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" /> {copy.missed}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {weekDays.map((day) => (
            <span key={day.key} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {day.short}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const style = statusStyles[day.status];
            const statusLabel =
              day.status === "complete"
                ? copy.closed
                : day.status === "partial"
                  ? copy.inProgress
                  : day.status === "missed"
                    ? copy.pending
                    : day.isFuture
                      ? copy.upcoming
                      : copy.none;

            return (
              <div
                key={day.date}
                className={cn(
                  "min-h-[4.6rem] rounded-[20px] border p-2 transition",
                  style,
                  !day.isCurrentMonth && "opacity-45",
                  day.isFuture && "opacity-60",
                  day.isToday && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-display text-base font-semibold">{day.dayNumber}</span>
                  {day.points > 0 ? <span className="text-[10px] font-semibold">+{day.points}</span> : null}
                </div>
                <div className="mt-3 text-[10px] font-medium leading-tight">
                  {day.scheduledCount > 0 ? (
                    <>
                      <p>{day.completedCount}/{day.scheduledCount} {copy.habits}</p>
                      <p className="opacity-80">{statusLabel}</p>
                    </>
                  ) : (
                    <p>{statusLabel}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

