"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Users2 } from "lucide-react";

import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchPlatformAdminOverview } from "@/lib/supabase/platform-admin";
import type { PlatformAdminOverviewData } from "@/types/platform-admin";

const statCardKeys = ["totalGyms", "activeGyms", "totalUsers", "totalMemberships"] as const;
const statIcons = [Building2, ShieldCheck, Users2, ShieldCheck];

export default function PlatformAdminDashboardPage() {
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();
  const [overview, setOverview] = useState<PlatformAdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          stats: {
            totalGyms: "Total gyms",
            activeGyms: "Active gyms",
            totalUsers: "Users",
            totalMemberships: "Active memberships"
          },
          noDate: "No date",
          loadError: "Could not load the platform panel.",
          loadingTitle: "Loading central control",
          loadingDescription: "Collecting gyms, users, and global metrics.",
          errorTitle: "We could not load the platform panel",
          unexpected: "An unexpected problem occurred.",
          retry: "Retry",
          title: "Global overview",
          description: "Central control of gyms, users, and memberships across the full BossFit operation.",
          viewGyms: "View gyms",
          recentGyms: "Recent gyms",
          latestGyms: "Latest created gyms",
          manage: "Manage",
          active: "Active",
          inactive: "Inactive",
          noOwner: "No owner",
          owners: "Owners",
          recentUsers: "Recent users",
          recentSignups: "Recent sign-ups",
          viewAll: "View all",
          gyms: "gyms",
          noGymRole: "No gym role"
        }
      : {
          stats: {
            totalGyms: "Gyms totales",
            activeGyms: "Gyms activos",
            totalUsers: "Usuarios",
            totalMemberships: "Memberships activas"
          },
          noDate: "Sin fecha",
          loadError: "No se pudo cargar el panel de plataforma.",
          loadingTitle: "Cargando control central",
          loadingDescription: "Estamos reuniendo gyms, usuarios y métricas globales.",
          errorTitle: "No pudimos cargar el panel de plataforma",
          unexpected: "Ocurrió un problema inesperado.",
          retry: "Reintentar",
          title: "Resumen global",
          description: "Control central de gyms, usuarios y memberships de toda la operación BossFit.",
          viewGyms: "Ver gyms",
          recentGyms: "Gyms recientes",
          latestGyms: "Últimos gyms creados",
          manage: "Gestionar",
          active: "Activo",
          inactive: "Inactivo",
          noOwner: "Sin owner",
          owners: "Owners",
          recentUsers: "Usuarios recientes",
          recentSignups: "Altas recientes",
          viewAll: "Ver todos",
          gyms: "gyms",
          noGymRole: "Sin rol gym"
        };

  const formatDate = (value?: string) => {
    if (!value) {
      return copy.noDate;
    }

    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  };

  const loadOverview = async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextOverview = await fetchPlatformAdminOverview(session.access_token);
      setOverview(nextOverview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, [session?.access_token]);

  if (loading) {
    return <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} />;
  }

  if (error || !overview) {
    return <AdminDataState title={copy.errorTitle} description={error ?? copy.unexpected} actionLabel={copy.retry} onAction={() => void loadOverview()} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/admin/gyms" className={buttonVariants({ variant: "secondary" })}>
            {copy.viewGyms}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCardKeys.map((key, index) => {
          const Icon = statIcons[index] ?? Building2;
          const value = overview[key];
          return (
            <Card key={key} className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-sm">{copy.stats[key]}</span>
              </div>
              <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{copy.recentGyms}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">{copy.latestGyms}</h3>
            </div>
            <Link href="/admin/gyms" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {copy.manage}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {overview.recentGyms.map((gym) => (
              <div key={gym.id} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground dark:text-white">{gym.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">/{gym.slug}</p>
                  </div>
                  <Badge className={gym.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border"}>
                    {gym.active ? copy.active : copy.inactive}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{copy.owners}: {gym.ownerNames.length ? gym.ownerNames.join(", ") : copy.noOwner}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(gym.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{copy.recentUsers}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">{copy.recentSignups}</h3>
            </div>
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {copy.viewAll}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {overview.recentUsers.map((user) => (
              <div key={user.userId} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                <p className="font-semibold text-card-foreground dark:text-white">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.gymCount} {copy.gyms}</Badge>
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.roles.length ? user.roles.join(", ") : copy.noGymRole}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
