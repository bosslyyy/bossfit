"use client";

import type { PropsWithChildren } from "react";

import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useAppLocale } from "@/hooks/use-app-locale";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/mock-data";
import { cn, titleCase } from "@/lib/utils";

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { context } = useAdminContext();
  const locale = useAppLocale();
  const copy =
    locale === "en"
      ? {
          back: "Back to BossFit",
          badge: "Gym Panel",
          eyebrow: "Gym Admin",
          currentRole: "Current role",
          nav: ["Overview", "Users", "Trainers", "Groups", "Assignments"],
          accessTitle: "Panel access",
          accessDescription:
            "This area already reads from your real gym and is ready to connect user creation, permissions, and advanced assignments."
        }
      : {
          back: "Volver a BossFit",
          badge: "Panel Gym",
          eyebrow: "Gym Admin",
          currentRole: "Rol actual",
          nav: ["Resumen", "Usuarios", "Entrenadores", "Grupos", "Asignaciones"],
          accessTitle: "Acceso del panel",
          accessDescription:
            "Esta secci�n ya consulta tu gym real y queda lista para conectar creación de usuarios, permisos y asignaciones avanzadas."
        };

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", className: "-ml-3 h-10 px-3 text-muted-foreground hover:text-card-foreground" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.back}
        </Link>
        <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{copy.badge}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[17rem,1fr] xl:items-start">
        <aside className="space-y-4 rounded-[32px] border border-border bg-card p-5 shadow-soft dark:bg-[#121922] dark:text-white xl:sticky xl:top-6">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#121B29] text-[#8FB1FF] shadow-[0_16px_32px_rgba(2,8,16,0.24)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{copy.eyebrow}</p>
              <h1 className="font-display text-2xl font-semibold leading-tight text-card-foreground dark:text-white">
                {context.gymName}
              </h1>
              <p className="text-sm text-muted-foreground">{copy.currentRole}: {titleCase(context.role)}</p>
            </div>
          </div>

          <nav className="grid gap-2">
            {ADMIN_NAV_ITEMS.map((item, index) => {
              const active = item.href === "/gym" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[20px] px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[#121B29] text-white shadow-[0_16px_34px_rgba(91,140,255,0.20)] ring-1 ring-[#4E7DFF]/24"
                      : "text-muted-foreground ring-1 ring-transparent hover:bg-background hover:text-card-foreground dark:hover:bg-white/[0.04]"
                  )}
                >
                  {copy.nav[index] ?? item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground dark:text-white">
              <ShieldCheck className="h-4 w-4 text-accent" />
              {copy.accessTitle}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{copy.accessDescription}</p>
          </div>
        </aside>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
