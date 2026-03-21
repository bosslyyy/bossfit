"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Activity, ArrowRight, BellDot, CalendarDays, ShieldCheck, Users } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { adminToneStyles } from "@/components/admin/admin-tone";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchAdminDashboardData, type AdminDashboardData } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const metricIcons = [Users, Activity, BellDot, ShieldCheck];

export default function AdminDashboardPage() {
  const { context } = useAdminContext();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextData = await fetchAdminDashboardData(context.gymId);
      setData(nextData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard del gym.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [context.gymId]);

  if (loading) {
    return <AdminDataState title="Cargando dashboard del gym" description="Estamos reuniendo métricas, alertas y actividad reciente del gimnasio." />;
  }

  if (error || !data) {
    return <AdminDataState title="No pudimos cargar el dashboard" description={error ?? "Ocurrió un problema inesperado."} actionLabel="Reintentar" onAction={() => void loadDashboard()} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Resumen del gimnasio"
        description="Vista operativa del gym con foco en miembros, coaches, grupos y asignaciones reales."
        action={
          <Link href="/gym/users" className={buttonVariants({ variant: "secondary" })}>
            Ver usuarios
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? Activity;
          return (
            <AdminMetricCard
              key={metric.label}
              icon={<Icon className="h-5 w-5" />}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              tone={metric.tone}
            />
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Alertas del gym</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">
                Lo que conviene revisar hoy
              </h3>
            </div>
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{context.gymName}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.alerts.map((alert) => {
              const styles = adminToneStyles[alert.tone];
              return (
                <div key={alert.title} className={cn("rounded-[24px] border p-4", styles.panel)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", styles.dot)} aria-hidden="true" />
                    <p className="text-sm font-semibold text-card-foreground dark:text-white">{alert.title}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{alert.detail}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Actividad reciente</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">
                Últimas asignaciones
              </h3>
            </div>
            <CalendarDays className="h-5 w-5 text-accent" />
          </div>

          <div className="space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.map((item) => (
                <div key={`${item.title}-${item.time}`} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-card-foreground dark:text-white">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))
            ) : (
              <AdminDataState title="Sin movimientos aún" description="Cuando empieces a asignar miembros, grupos o planes, aparecerán aquí." />
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Siguiente paso</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">
              Listo para creación de usuarios del gym
            </h3>
          </div>
          <Link href="/gym/assignments" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            Ir a asignaciones
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          El panel ya lee datos reales del gym. El siguiente bloque será crear usuarios desde el panel, asignarlos a un entrenador o grupo y generar sus credenciales temporales.
        </p>
      </Card>
    </div>
  );
}



