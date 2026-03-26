"use client";

import { Flame, Target, Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import { cn } from "@/lib/utils";
import type { CoachMemberOverview } from "@/lib/supabase/coach";

function dayTone(status: CoachMemberOverview["recentDays"][number]["status"]) {
  switch (status) {
    case "complete":
      return "bg-emerald-400";
    case "partial":
      return "bg-amber-400";
    case "missed":
      return "bg-rose-400/80";
    default:
      return "bg-white/10";
  }
}

export function CoachMemberCard({
  member,
  selected,
  onSelect
}: {
  member: CoachMemberOverview;
  selected: boolean;
  onSelect: () => void;
}) {
  const locale = useAppLocale();
  const copy =
    locale === "en"
      ? {
          plan: "Plan",
          streak: "Streak",
          compliance: "Comp.",
          days: "days",
          today: "today",
          activeHabits: "active habits"
        }
      : {
          plan: "Plan",
          streak: "Racha",
          compliance: "Cumpl.",
          days: "dÃ­as",
          today: "hoy",
          activeHabits: "ejercicios activos"
        };

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card
        className={cn(
          "rounded-[30px] border bg-[#111A24] p-5 text-white transition",
          selected ? "border-cyan-400/40 shadow-[0_18px_50px_rgba(8,145,178,0.16)]" : "border-white/8 hover:border-white/16"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold text-white">{member.name}</p>
            <p className="mt-1 truncate text-sm text-white/58">{member.email}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            {member.groupName}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-white/50">
              <Target className="h-4 w-4" />
              {copy.plan}
            </div>
            <p className="mt-2 font-semibold text-white">{member.planName}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-white/50">
              <Flame className="h-4 w-4" />
              {copy.streak}
            </div>
            <p className="mt-2 font-semibold text-white">{member.currentStreak} {copy.days}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-white/50">
              <Trophy className="h-4 w-4" />
              {copy.compliance}
            </div>
            <p className="mt-2 font-semibold text-white">{member.weeklyCompliance}%</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {member.recentDays.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", dayTone(day.status))} />
                <span className="text-[11px] text-white/38">{day.shortLabel}</span>
              </div>
            ))}
          </div>
          <div className="text-right text-sm text-white/55">
            <p>{member.completedToday}/{member.scheduledToday} {copy.today}</p>
            <p>{member.activeHabits} {copy.activeHabits}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}

