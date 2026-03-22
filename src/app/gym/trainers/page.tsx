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
import { useAppLocale } from "@/hooks/use-app-locale";
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
  const locale = useAppLocale();
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTrainerId, setBusyTrainerId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialResult | null>(null);
  const [copiedField, setCopiedField] = useState<"alias" | "email" | "password" | null>(null);

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load the trainer list.",
          noSession: "Could not find a valid session to manage credentials.",
          confirmReset: (name: string) => `Regenerate temporary access and password for ${name}?`,
          resetError: "Could not regenerate credentials.",
          title: "Trainers",
          description: "Real staff roster with members, linked groups, and direct access to each full profile.",
          credentialsTitle: "Credentials regenerated",
          credentialsDescription:
            "Passwords cannot be read from Auth, but you can issue a new temporary access for the coach.",
          trainer: "Trainer",
          role: "Role",
          username: "Username",
          fullAccess: "Full access",
          temporaryPassword: "Temporary password",
          copied: "Copied",
          currentLoad: "Current load",
          currentLoadHelper: "Members assigned across all gym coaches.",
          activeTeam: "Active team",
          linkedGroups: "linked groups",
          loadingTitle: "Loading trainers",
          loadingDescription: "Collecting active staff from the gym.",
          errorTitle: "We could not load staff",
          retry: "Retry",
          emptyTitle: "No trainers in this gym yet",
          emptyDescription: "When you add trainer-role memberships, they will appear here automatically.",
          manage: "Manage",
          regenerating: "Regenerating access...",
          regenerate: "Regenerate access"
        }
      : {
          loadError: "No se pudo cargar la lista de entrenadores.",
          noSession: "No encontramos una sesión válida para gestionar credenciales.",
          confirmReset: (name: string) => `¿Regenerar acceso y contraseña temporal para ${name}?`,
          resetError: "No se pudieron regenerar las credenciales.",
          title: "Entrenadores",
          description: "Roster real del staff con miembros, grupos asignados y acceso directo a su ficha completa.",
          credentialsTitle: "Credenciales regeneradas",
          credentialsDescription:
            "Las contraseñas no se pueden leer de Auth, pero sí puedes reemitir un acceso temporal nuevo para el coach.",
          trainer: "Entrenador",
          role: "Rol",
          username: "Usuario",
          fullAccess: "Acceso completo",
          temporaryPassword: "Contraseña temporal",
          copied: "Copiado",
          currentLoad: "Carga actual",
          currentLoadHelper: "Miembros asignados entre todos los coaches del gym.",
          activeTeam: "Equipo activo",
          linkedGroups: "grupos vinculados",
          loadingTitle: "Cargando entrenadores",
          loadingDescription: "Estamos reuniendo el staff activo del gimnasio.",
          errorTitle: "No pudimos cargar el staff",
          retry: "Reintentar",
          emptyTitle: "Aún no hay entrenadores en este gym",
          emptyDescription: "Cuando agregues memberships con rol trainer, aparecer�n aquí automáticamente.",
          manage: "Gestionar",
          regenerating: "Regenerando acceso...",
          regenerate: "Regenerar acceso"
        };

  const membersAssigned = useMemo(() => trainers.reduce((total, trainer) => total + trainer.membersCount, 0), [trainers]);

  const loadTrainers = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextTrainers = await fetchAdminTrainers(context.gymId);
      setTrainers(nextTrainers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
      setError(copy.noSession);
      return;
    }

    const confirmed = window.confirm(copy.confirmReset(trainer.name));
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
      setError(resetError instanceof Error ? resetError.message : copy.resetError);
    } finally {
      setBusyTrainerId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />

      {credentials ? (
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.credentialsTitle}</CardTitle>
            <CardDescription>{copy.credentialsDescription}</CardDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.trainer}</p>
              <p className="mt-2 text-sm text-muted-foreground">{credentials.fullName}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.role}</p>
              <p className="mt-2 text-sm text-muted-foreground">{credentials.role}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.username}</p>
                <button type="button" onClick={() => void handleCopy(credentials.alias, "alias")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                <span>{credentials.alias}</span>
              </div>
              {copiedField === "alias" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.fullAccess}</p>
                <button type="button" onClick={() => void handleCopy(credentials.email, "email")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 break-all text-sm text-muted-foreground">{credentials.email}</p>
              {copiedField === "email" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04] sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.temporaryPassword}</p>
                <button type="button" onClick={() => void handleCopy(credentials.password, "password")} className="text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                <span>{credentials.password}</span>
              </div>
              {copiedField === "password" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-sm">{copy.currentLoad}</span>
          </div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{membersAssigned}</p>
          <p className="text-sm text-muted-foreground">{copy.currentLoadHelper}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-accent" />
            <span className="text-sm">{copy.activeTeam}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{trainers.length} coaches</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{trainers.reduce((total, trainer) => total + trainer.groupsCount, 0)} {copy.linkedGroups}</Badge>
          </div>
        </Card>
      </div>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && error ? <AdminDataState title={copy.errorTitle} description={error} actionLabel={copy.retry} onAction={() => void loadTrainers()} tone="warning" /> : null}
      {!loading && !error && trainers.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

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
                    {copy.manage}
                  </Link>
                  <Button variant="secondary" onClick={() => void handleResetCredentials(trainer)} disabled={busyTrainerId === trainer.userId}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {busyTrainerId === trainer.userId ? copy.regenerating : copy.regenerate}
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
