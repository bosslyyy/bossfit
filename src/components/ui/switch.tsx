import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  ariaLabel
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-accent" : "bg-black/10 dark:bg-white/10"
      )}
    >
      <span
        className={cn(
          "h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-0"
        )}
      />
    </button>
  );
}
