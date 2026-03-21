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
import { fetchPlatformAdminOverview } from "@/lib/supabase/platform-admin";
import type { PlatformAdminOverviewData } from "@/types/platform-admin";

const statCards = [
  { key: "totalGyms", label: "Gyms totales", icon: Building2 },
  { key: "activeGyms", label: "Gyms activos", icon: ShieldCheck },
  { key: "totalUsers", label: "Usuarios", icon: Users2 },
  { key: "totalMemberships", label: "Memberships activas", icon: ShieldCheck }
] as const;

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function PlatformAdminDashboardPage() {
  const { session } = useSupabaseAuth();
  const [overview, setOverview] = useState<PlatformAdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel de plataforma.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, [session?.access_token]);

  if (loading) {
    return <AdminDataState title="Cargando control central" description="Estamos reuniendo gyms, usuarios y métricas globales." />;
  }

  if (error || !overview) {
    return <AdminDataState title="No pudimos cargar el panel de plataforma" description={error ?? "Ocurrió un problema inesperado."} actionLabel="Reintentar" onAction={() => void loadOverview()} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Resumen global"
        description="Control central de gyms, usuarios y memberships de toda la operación BossFit."
        action={
          <Link href="/admin/gyms" className={buttonVariants({ variant: "secondary" })}>
            Ver gyms
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          const value = overview[item.key];
          return (
            <Card key={item.key} className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-sm">{item.label}</span>
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
              <p className="text-sm text-muted-foreground">Gyms recientes</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">Últimos gyms creados</h3>
            </div>
            <Link href="/admin/gyms" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Gestionar
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
                    {gym.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Owners: {gym.ownerNames.length ? gym.ownerNames.join(", ") : "Sin owner"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(gym.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Usuarios recientes</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">Altas recientes</h3>
            </div>
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {overview.recentUsers.map((user) => (
              <div key={user.userId} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                <p className="font-semibold text-card-foreground dark:text-white">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.gymCount} gyms</Badge>
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.roles.length ? user.roles.join(", ") : "Sin rol gym"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
