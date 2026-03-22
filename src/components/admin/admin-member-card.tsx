"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import type { AdminMemberListItem } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const membershipStatusStyles: Record<AdminMemberListItem["status"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  invited: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
  suspended: "bg-[#FFF0F0] text-[#B44141] dark:bg-[#2B1515] dark:text-[#FF9A9A]"
};

const assignmentStatusStyles: Record<AdminMemberListItem["assignmentStatus"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  pending: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
  unassigned: "bg-muted text-card-foreground dark:bg-white/[0.08] dark:text-white/80"
};

export function AdminMemberCard({ member, action }: { member: AdminMemberListItem; action?: ReactNode }) {
  const locale = useAppLocale();

  const assignmentStatusLabel: Record<AdminMemberListItem["assignmentStatus"], string> =
    locale === "en"
      ? {
          active: "Assigned",
          pending: "Pending",
          paused: "Paused",
          unassigned: "Unassigned"
        }
      : {
          active: "Asignado",
          pending: "Pendiente",
          paused: "Pausado",
          unassigned: "Sin asignar"
        };

  const copy =
    locale === "en"
      ? {
          trainer: "Trainer",
          group: "Group",
          plan: "Plan",
          joined: "Joined gym",
          noDate: "No date"
        }
      : {
          trainer: "Entrenador",
          group: "Grupo",
          plan: "Plan",
          joined: "Alta en el gym",
          noDate: "Sin fecha"
        };

  return (
    <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-card-foreground dark:text-white">{member.name}</h3>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className={cn("ring-1 ring-black/5 dark:ring-white/5", membershipStatusStyles[member.status])}>
            {member.status}
          </Badge>
          <Badge className={cn("ring-1 ring-black/5 dark:ring-white/5", assignmentStatusStyles[member.assignmentStatus])}>
            {assignmentStatusLabel[member.assignmentStatus]}
          </Badge>
          {action}
        </div>
      </div>

      <div className="grid gap-3 rounded-[22px] border border-border bg-background/80 p-4 sm:grid-cols-3 dark:bg-white/[0.04]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.trainer}</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{member.trainerName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.group}</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{member.groupName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.plan}</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{member.planName}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.joined}: {member.joinedAt ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium" }).format(new Date(member.joinedAt)) : copy.noDate}
      </p>
    </Card>
  );
}
