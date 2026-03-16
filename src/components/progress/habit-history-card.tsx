import { HabitIcon } from "@/components/habits/habit-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HABIT_COLOR_STYLES } from "@/lib/constants";
import { cn, formatHabitTarget } from "@/lib/utils";
import type { Habit, HabitHistoryPoint } from "@/types/habit";

export function HabitHistoryCard({
  habit,
  history
}: {
  habit: Habit;
  history: HabitHistoryPoint[];
}) {
  const styles = HABIT_COLOR_STYLES[habit.color];

  return (
    <Card className={`border ${styles.border}`}>
      <div className="flex items-start justify-between gap-3 text-card-foreground">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-card-foreground shadow-sm ring-1 ring-border dark:bg-surface dark:ring-border">
            <HabitIcon icon={habit.icon} />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-card-foreground">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">{formatHabitTarget(habit.targetSets, habit.repsPerSet)}</p>
          </div>
        </div>
        <Badge
          className={cn(
            styles.badge,
            "ring-1 ring-border/50 dark:bg-surface dark:text-card-foreground dark:ring-border"
          )}
        >
          {habit.category ?? "fitness"}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {history.map((entry) => (
          <div key={entry.date} className="space-y-2 text-center">
            <span className="block text-[11px] font-semibold text-muted-foreground">{entry.shortLabel}</span>
            <div
              className={`flex h-14 items-center justify-center rounded-2xl border text-xs font-semibold shadow-sm ${
                !entry.scheduled
                  ? "border-border/70 bg-surface text-muted-foreground dark:bg-surface"
                  : entry.isCompleted
                    ? `${styles.solid} border-transparent text-white ring-1 ring-black/5`
                    : `border-border bg-muted text-card-foreground dark:bg-surface`
              }`}
            >
              {!entry.scheduled ? "-" : `${entry.completedSets}/${entry.targetSets}`}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
