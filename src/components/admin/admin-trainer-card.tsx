"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import type { AdminTrainerListItem } from "@/lib/supabase/admin";

const statusStyles: Record<AdminTrainerListItem["status"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  invited: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
  suspended: "bg-[#FFF0F0] text-[#B44141] dark:bg-[#2B1515] dark:text-[#FF9A9A]"
};

function getLoadLabel(membersCount: number, locale: "es" | "en") {
  if (membersCount >= 18) {
    return locale === "en" ? "High load" : "Carga alta";
  }

  if (membersCount >= 10) {
    return locale === "en" ? "Medium load" : "Carga media";
  }

  return locale === "en" ? "Has room" : "Con cupo";
}

export function AdminTrainerCard({ trainer, action }: { trainer: AdminTrainerListItem; action?: ReactNode }) {
  const locale = useAppLocale();
  const copy =
    locale === "en"
      ? {
          members: "Members",
          groups: "Groups",
          status: "Status"
        }
      : {
          members: "Miembros",
          groups: "Grupos",
          status: "Estado"
        };

  return (
    <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-card-foreground dark:text-white">{trainer.name}</h3>
          <p className="text-sm text-muted-foreground">{trainer.email}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge className={statusStyles[trainer.status]}>{trainer.status}</Badge>
          <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{getLoadLabel(trainer.membersCount, locale)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04] sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.members}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-card-foreground dark:text-white">{trainer.membersCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.groups}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-card-foreground dark:text-white">{trainer.groupsCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.status}</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{trainer.status}</p>
        </div>
      </div>

      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </Card>
  );
}
