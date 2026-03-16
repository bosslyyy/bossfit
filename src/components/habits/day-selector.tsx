import { WEEK_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { WeekdayKey } from "@/types/habit";

export function DaySelector({
  value,
  onChange,
  error
}: {
  value: WeekdayKey[];
  onChange: (days: WeekdayKey[]) => void;
  error?: string;
}) {
  const toggleDay = (dayKey: WeekdayKey) => {
    const hasDay = value.includes(dayKey);
    const nextDays = hasDay ? value.filter((entry) => entry !== dayKey) : [...value, dayKey];
    const orderedDays = WEEK_DAYS.filter((day) => nextDays.includes(day.key)).map((day) => day.key);
    onChange(orderedDays);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => {
          const selected = value.includes(day.key);
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-2xl border text-sm font-semibold transition",
                selected
                  ? "border-accent bg-accent text-accent-foreground shadow-panel"
                  : "border-border bg-white/70 text-foreground/65 hover:bg-white dark:bg-white/5"
              )}
              aria-pressed={selected}
              aria-label={day.label}
            >
              {day.short}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
