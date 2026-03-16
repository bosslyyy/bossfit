import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  indicatorClassName
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-300",
          indicatorClassName
        )}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
