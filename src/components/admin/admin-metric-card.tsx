import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import type { AdminTone } from "@/lib/admin/mock-data";
import { cn } from "@/lib/utils";

import { adminToneStyles } from "./admin-tone";

export function AdminMetricCard({
  icon,
  label,
  value,
  helper,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: AdminTone;
}) {
  const styles = adminToneStyles[tone];

  return (
    <Card className={cn("space-y-4 border", styles.panel)}>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", styles.badge)}>{icon}</div>
      </div>
      <p className={cn("text-sm font-medium", styles.text)}>{helper}</p>
    </Card>
  );
}
