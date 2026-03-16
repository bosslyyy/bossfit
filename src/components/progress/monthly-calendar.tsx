import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { WEEK_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/habit";

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
  onNextMonth
}: {
  monthLabel: string;
  days: CalendarDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Calendario de progreso</CardTitle>
            <CardDescription>Detecta rápido tus días completos, parciales o sin carga.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={onPreviousMonth} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={onNextMonth} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface px-4 py-3">
          <p className="font-display text-lg font-semibold text-card-foreground">{monthLabel}</p>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Completo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F6B21A]" /> Parcial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" /> Incompleto
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {WEEK_DAYS.map((day) => (
            <span key={day.key} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {day.short}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const style = statusStyles[day.status];

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
                      <p>{day.completedCount}/{day.scheduledCount} hábitos</p>
                      <p className="opacity-80">{day.status === "complete" ? "Cerrado" : day.status === "partial" ? "En curso" : "Pendiente"}</p>
                    </>
                  ) : (
                    <p>{day.isFuture ? "Próximo" : "Sin hábitos"}</p>
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
