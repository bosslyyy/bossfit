import type { ReactNode } from "react";

export function AdminSectionHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>
        {description ? <p className="max-w-[34rem] text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
