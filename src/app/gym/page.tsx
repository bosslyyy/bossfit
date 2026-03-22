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
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchAdminDashboardData, type AdminDashboardData } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const metricIcons = [Users, Activity, BellDot, ShieldCheck];

export default function AdminDashboardPage() {
  const { context } = useAdminContext();
  const locale = useAppLocale();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load the gym dashboard.",
          loadingTitle: "Loading gym dashboard",
          loadingDescription: "Collecting metrics, alerts, and recent activity from the gym.",
          errorTitle: "We could not load the dashboard",
          unexpected: "An unexpected problem occurred.",
          retry: "Retry",
          title: "Gym overview",
          description: "Operational view of the gym focused on members, coaches, groups, and real assignments.",
          viewUsers: "View users",
          gymAlerts: "Gym alerts",
          reviewToday: "What needs review today",
          recentActivity: "Recent activity",
          latestAssignments: "Latest assignments",
          emptyTitle: "No movement yet",
          emptyDescription: "When you start assigning members, groups, or plans, they will appear here.",
          nextStep: "Next step",
          readyTitle: "Ready for gym user creation",
          goAssignments: "Go to assignments",
          footer:
            "The panel already reads real gym data. The next block is creating users from the panel, assigning them to a trainer or group, and generating temporary credentials."
        }
      : {
          loadError: "No se pudo cargar el dashboard del gym.",
          loadingTitle: "Cargando dashboard del gym",
          loadingDescription: "Estamos reuniendo métricas, alertas y actividad reciente del gimnasio.",
          errorTitle: "No pudimos cargar el dashboard",
          unexpected: "Ocurrió un problema inesperado.",
          retry: "Reintentar",
          title: "Resumen del gimnasio",
          description: "Vista operativa del gym con foco en miembros, coaches, grupos y asignaciones reales.",
          viewUsers: "Ver usuarios",
          gymAlerts: "Alertas del gym",
          reviewToday: "Lo que conviene revisar hoy",
          recentActivity: "Actividad reciente",
          latestAssignments: "Últimas asignaciones",
          emptyTitle: "Sin movimientos aún",
          emptyDescription: "Cuando empieces a asignar miembros, grupos o planes, aparecer�n aquí.",
          nextStep: "Siguiente paso",
          readyTitle: "Listo para creación de usuarios del gym",
          goAssignments: "Ir a asignaciones",
          footer:
            "El panel ya lee datos reales del gym. El siguiente bloque será crear usuarios desde el panel, asignarlos a un entrenador o grupo y generar sus credenciales temporales."
        };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextData = await fetchAdminDashboardData(context.gymId);
      setData(nextData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [context.gymId]);

  if (loading) {
    return <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} />;
  }

  if (error || !data) {
    return <AdminDataState title={copy.errorTitle} description={error ?? copy.unexpected} actionLabel={copy.retry} onAction={() => void loadDashboard()} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/gym/users" className={buttonVariants({ variant: "secondary" })}>
            {copy.viewUsers}
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
              <p className="text-sm text-muted-foreground">{copy.gymAlerts}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">{copy.reviewToday}</h3>
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
              <p className="text-sm text-muted-foreground">{copy.recentActivity}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">{copy.latestAssignments}</h3>
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
              <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} />
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{copy.nextStep}</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-card-foreground dark:text-white">{copy.readyTitle}</h3>
          </div>
          <Link href="/gym/assignments" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            {copy.goAssignments}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{copy.footer}</p>
      </Card>
    </div>
  );
}
