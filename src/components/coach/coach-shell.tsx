"use client";

import type { PropsWithChildren } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, ClipboardList, Users } from "lucide-react";

import { useCoachContext } from "@/components/coach/coach-access-gate";
import { cn } from "@/lib/utils";

const coachNavItems = [
  { href: "/coach?view=summary", label: "Resumen", icon: Activity, view: "summary" },
  { href: "/coach?view=members", label: "Alumnos", icon: Users, view: "members" },
  { href: "/coach?view=training", label: "Entrenamientos", icon: ClipboardList, view: "training" }
] as const;

export function CoachShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { context } = useCoachContext();
  const activeView = searchParams.get("view") ?? "summary";

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem,minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <div className="flex h-full flex-col rounded-[32px] border border-border bg-[#0F151E] p-5 text-white shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
          <div className="space-y-3 border-b border-white/10 pb-5">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Volver a BossFit
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Coach Mode</p>
              <h1 className="font-display text-2xl font-semibold text-white">{context.gymName}</h1>
              <p className="text-sm text-white/65">Panel profesional para seguimiento diario del staff.</p>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            {coachNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === "/coach" && activeView === item.view;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-semibold transition",
                    active ? "bg-white text-slate-950" : "text-white/68 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">{context.displayName ?? context.userEmail ?? "Coach activo"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-300">Entrenador</p>
            <p className="mt-3 text-sm text-white/65">
              Gestiona alumnos, revisa progreso real y ajusta entrenamientos sin salir del panel.
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
