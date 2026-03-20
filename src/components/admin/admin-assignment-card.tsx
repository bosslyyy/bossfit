import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminAssignmentListItem } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const statusStyles: Record<AdminAssignmentListItem["status"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  pending: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]"
};

const statusLabel: Record<AdminAssignmentListItem["status"], string> = {
  active: "Activa",
  pending: "Pendiente",
  paused: "Pausada"
};

export function AdminAssignmentCard({ assignment, action }: { assignment: AdminAssignmentListItem; action?: ReactNode }) {
  return (
    <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-card-foreground dark:text-white">{assignment.memberName}</h3>
          <p className="text-sm text-muted-foreground">{assignment.memberEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("ring-1 ring-black/5 dark:ring-white/5", statusStyles[assignment.status])}>{statusLabel[assignment.status]}</Badge>
          {action}
        </div>
      </div>

      <div className="space-y-3 rounded-[22px] border border-border bg-background/80 p-4 text-sm dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Entrenador</span>
          <span className="font-semibold text-card-foreground dark:text-white">{assignment.trainerName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Grupo</span>
          <span className="font-semibold text-card-foreground dark:text-white">{assignment.groupName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-semibold text-card-foreground dark:text-white">{assignment.planName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Asignada</span>
          <span className="font-semibold text-card-foreground dark:text-white">{new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(assignment.assignedAt))}</span>
        </div>
      </div>
    </Card>
  );
}
