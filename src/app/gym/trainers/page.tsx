"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { CalendarClock, Copy, Eye, KeyRound, RefreshCcw, Target, UserRound } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { AdminTrainerCard } from "@/components/admin/admin-trainer-card";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { resetAdminUserCredentials } from "@/lib/supabase/admin-actions";
import { fetchAdminTrainers, type AdminTrainerListItem } from "@/lib/supabase/admin";

interface CredentialResult {
  userId: string;
  alias: string;
  email: string;
  password: string;
  role: "owner" | "admin" | "trainer" | "member";
  fullName: string;
}

export default function AdminTrainersPage() {
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTrainerId, setBusyTrainerId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialResult | null>(null);
  const [copiedField, setCopiedField] = useState<"alias" | "email" | "password" | null>(null);

  const membersAssigned = useMemo(() => trainers.reduce((total, trainer) => total + trainer.membersCount, 0), [trainers]);

  const loadTrainers = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextTrainers = await fetchAdminTrainers(context.gymId);
      setTrainers(nextTrainers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de entrenadores.");
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrainers();
  }, [context.gymId]);

  const handleCopy = async (value: string, field: "alias" | "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  const handleResetCredentials = async (trainer: AdminTrainerListItem) => {
    if (!session?.access_token) {
      setError("No encontramos una sesión válida para gestionar credenciales.");
      return;
    }

    const confirmed = window.confirm(`¿Regenerar acceso y contraseña temporal para ${trainer.name}?`);
    if (!confirmed) {
      return;
    }

    setBusyTrainerId(trainer.userId);
    setError(null);

    try {
      const payload = await resetAdminUserCredentials(session.access_token, trainer.userId, context.gymId);
      setCredentials(payload.credentials);
      await loadTrainers();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "No se pudieron regenerar las credenciales.");
    } finally {
      setBusyTrainerId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Entrenadores" description="Roster real del staff con miembros, grupos asignados y acceso directo a su ficha completa." />

      {credentials ? (
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Credenciales regeneradas</CardTitle>
            <CardDescription>
              Las contraseñas no se pueden leer de Auth, pero sí puedes reemitir un acceso temporal nuevo para el coach.
            </CardDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">Entrenador</p>
              <p className="mt-2 text-sm text-muted-foreground">{credentials.fullName}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">Rol</p>
              <p className="mt-2 text-sm text-muted-foreground">{credentials.role}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Usuario</p>
                <button type="button" onClick={() => void handleCopy(credentials.alias, "alias")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                <span>{credentials.alias}</span>
              </div>
              {copiedField === "alias" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Acceso completo</p>
                <button type="button" onClick={() => void handleCopy(credentials.email, "email")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 break-all text-sm text-muted-foreground">{credentials.email}</p>
              {copiedField === "email" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04] sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Contraseña temporal</p>
                <button type="button" onClick={() => void handleCopy(credentials.password, "password")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                <span>{credentials.password}</span>
              </div>
              {copiedField === "password" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-sm">Carga actual</span>
          </div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{membersAssigned}</p>
          <p className="text-sm text-muted-foreground">Miembros asignados entre todos los coaches del gym.</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-accent" />
            <span className="text-sm">Equipo activo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{trainers.length} coaches</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{trainers.reduce((total, trainer) => total + trainer.groupsCount, 0)} grupos vinculados</Badge>
          </div>
        </Card>
      </div>

      {loading ? <AdminDataState title="Cargando entrenadores" description="Estamos reuniendo el staff activo del gimnasio." /> : null}
      {!loading && error ? <AdminDataState title="No pudimos cargar el staff" description={error} actionLabel="Reintentar" onAction={() => void loadTrainers()} tone="warning" /> : null}
      {!loading && !error && trainers.length === 0 ? <AdminDataState title="Aún no hay entrenadores en este gym" description="Cuando agregues memberships con rol trainer, aparecerán aquí automáticamente." /> : null}

      {!loading && !error && trainers.length ? (
        <div className="space-y-4">
          {trainers.map((trainer) => (
            <AdminTrainerCard
              key={trainer.membershipId}
              trainer={trainer}
              action={
                <div className="flex flex-wrap gap-2">
                  <Link href={`/gym/users/${trainer.userId}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                    <Eye className="mr-2 h-4 w-4" />
                    Gestionar
                  </Link>
                  <Button variant="secondary" onClick={() => void handleResetCredentials(trainer)} disabled={busyTrainerId === trainer.userId}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {busyTrainerId === trainer.userId ? "Regenerando acceso..." : "Regenerar acceso"}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}



