"use client";

import type { PropsWithChildren } from "react";

import Link from "next/link";
import { ArrowLeft, Building2, Crown, ShieldCheck, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { usePlatformAdminContext } from "@/components/platform-admin/platform-admin-access-gate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useAppLocale } from "@/hooks/use-app-locale";
import { cn } from "@/lib/utils";

export function PlatformAdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { context } = usePlatformAdminContext();
  const locale = useAppLocale();

  const navItems =
    locale === "en"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/gyms", label: "Gyms" },
          { href: "/admin/users", label: "Users" }
        ]
      : [
          { href: "/admin", label: "Resumen" },
          { href: "/admin/gyms", label: "Gyms" },
          { href: "/admin/users", label: "Usuarios" }
        ];

  const copy =
    locale === "en"
      ? {
          back: "Back to BossFit",
          badge: "Platform Admin",
          eyebrow: "BossFit Core",
          controlTitle: "Central control",
          gyms: "Create and operate gyms",
          users: "View global users"
        }
      : {
          back: "Volver a BossFit",
          badge: "Platform Admin",
          eyebrow: "BossFit Core",
          controlTitle: "Control central",
          gyms: "Crear y operar gyms",
          users: "Ver usuarios globales"
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
              <Crown className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{copy.eyebrow}</p>
              <h1 className="font-display text-2xl font-semibold leading-tight text-card-foreground dark:text-white">
                {context.label}
              </h1>
              <p className="text-sm text-muted-foreground break-all">{context.email}</p>
            </div>
          </div>

          <nav className="grid gap-2">
            {navItems.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04] space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground dark:text-white">
              <ShieldCheck className="h-4 w-4 text-accent" />
              {copy.controlTitle}
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                {copy.gyms}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                {copy.users}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
