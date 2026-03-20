import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminGroupListItem } from "@/lib/supabase/admin";

export function AdminGroupCard({ group, action }: { group: AdminGroupListItem; action?: ReactNode }) {
  return (
    <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-card-foreground dark:text-white">{group.name}</h3>
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className={group.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border dark:bg-white/[0.08] dark:text-white/80"}>
            {group.active ? "Activo" : "Pausado"}
          </Badge>
          {action}
        </div>
      </div>

      <div className="space-y-3 rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Coach</span>
          <span className="font-semibold text-card-foreground dark:text-white">{group.trainerName}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Horario</span>
          <span className="text-right font-semibold text-card-foreground dark:text-white">{group.scheduleText}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Miembros</span>
          <span className="font-semibold text-card-foreground dark:text-white">{group.membersCount}</span>
        </div>
      </div>
    </Card>
  );
}
