"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, KeyRound, RefreshCcw, Save, Shield, Trash2, UserRound, Users } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLocale } from "@/hooks/use-app-locale";
import { getCategoryLabel, getIntlLocale, getLevelLabel, getWeekDays } from "@/lib/i18n";
import {
  deleteAdminUser,
  fetchAdminUserDetail,
  resetAdminUserCredentials,
  updateAdminUser,
  type AdminCredentialResetResult
} from "@/lib/supabase/admin-actions";
import { fetchAdminGroups, fetchAdminTrainers, type AdminGroupListItem, type AdminTrainerListItem, type AdminUserDetail } from "@/lib/supabase/admin";
import { formatHabitTarget } from "@/lib/utils";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

const membershipStatusStyles: Record<AdminUserDetail["status"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  invited: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
  suspended: "bg-[#FFF0F0] text-[#B44141] dark:bg-[#2B1515] dark:text-[#FF9A9A]"
};

function formatSelectedDays(selectedDays: string[], locale: "es" | "en") {
  return getWeekDays(locale).filter((day) => selectedDays.includes(day.key)).map((day) => day.short).join(" Â· ");
}

function formatDate(value: string | undefined, locale: "es" | "en", withTime = true) {
  if (!value) {
    return locale === "en" ? "No data" : "Sin dato";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

function statusLabel(status: AdminUserDetail["status"], locale: "es" | "en") {
  return locale === "en"
    ? { active: "Active", invited: "Invited", paused: "Paused", suspended: "Suspended" }[status]
    : { active: "Activo", invited: "Invitado", paused: "Pausado", suspended: "Suspendido" }[status];
}

function roleLabel(role: AdminUserDetail["role"], locale: "es" | "en") {
  return locale === "en"
    ? { owner: "Owner", admin: "Admin", trainer: "Trainer", member: "Member" }[role]
    : { owner: "Owner", admin: "Admin", trainer: "Entrenador", member: "Miembro" }[role];
}

function assignmentLabel(status: "active" | "pending" | "paused", locale: "es" | "en") {
  return locale === "en"
    ? { active: "Active", pending: "Pending", paused: "Paused" }[status]
    : { active: "Activa", pending: "Pendiente", paused: "Pausada" }[status];
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [groups, setGroups] = useState<AdminGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingCredentials, setResettingCredentials] = useState(false);
  const [credentials, setCredentials] = useState<AdminCredentialResetResult | null>(null);
  const [copiedField, setCopiedField] = useState<"alias" | "email" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "trainer" | "member">("member");
  const [status, setStatus] = useState<AdminUserDetail["status"]>("active");
  const [trainerUserId, setTrainerUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<"active" | "pending" | "paused">("pending");

  const userId = params.userId;
  const backHref = detail?.role === "trainer" ? "/gym/trainers" : "/gym/users";
  const activeGroups = useMemo(() => groups.filter((group) => group.active), [groups]);

  const copy = locale === "en"
    ? {
        loadError: "Could not load the user profile.", saveError: "Could not save the profile.", deleteError: "Could not remove the user.",
        resetError: "Could not regenerate credentials.", saved: "Profile updated successfully.",
        deleteConfirm: (name: string) => `Remove ${name} from the gym system?`, resetConfirm: (name: string) => `Regenerate temporary access for ${name}?`,
        loadingTitle: "Loading user profile", loadingDescription: "Gathering profile, gym state, and current user progress.",
        missingTitle: "We could not find the user", missingDescription: "It may no longer belong to this gym.",
        back: "Back", description: "Full profile to edit the account, fix assignments, review progress, and manage access from the gym panel.",
        username: "Username", noUsername: "No username", regenerateAccess: "Regenerate access", regenerating: "Regenerating access...",
        delete: "Delete", deleting: "Deleting...", habits: "Exercises", activeHabits: "active", currentStreak: "Current streak", best: "Best",
        points: "Boss Points", level: "Level", today: "Today", todayHelper: "completed / scheduled", accountTitle: "Account and profile",
        accountDescription: "Edit the visible name, username, role, and operating state of the account inside the gym.", fullName: "Full name",
        role: "Role", member: "Member", trainer: "Trainer", admin: "Admin", status: "Status", security: "Security and account",
        securityDescription: "Operational summary of access and recent account activity.", alias: "Alias", managedAccount: "Managed account",
        yes: "Yes", no: "No", lastActivity: "Last activity", recentState: "Recent state", created: "Created", lastAccess: "Last access",
        assignedMembers: "Assigned members", groupsInCharge: "Groups in charge", assignmentTitle: "Primary assignment",
        assignmentDescription: "Fix trainer, group, and follow-up status without leaving this profile.", assignmentTrainer: "Trainer",
        noTrainer: "No trainer", assignmentGroup: "Group", noGroup: "No group", assignmentStatus: "Status", credsTitle: "New temporary credentials",
        credsDescription: "Use them to deliver updated access to the user from the gym.", user: "User", fullAccess: "Full access",
        tempPassword: "Temporary password", copied: "Copied", linkedGroups: "Linked groups", linkedGroupsDescription: "Quick reference to groups where this user currently appears.",
        routineTitle: "Current routine", routineDescription: "Current exercises loaded into the user's account.", paused: "Paused", noHabits: "This user does not have exercises loaded into the account yet.",
        save: "Save profile", saving: "Saving changes...", ownersProtected: "Owners are protected and cannot be removed from this screen.", noRecord: "No record"
      }
    : {
        loadError: "No se pudo cargar la ficha del usuario.", saveError: "No se pudo guardar la ficha.", deleteError: "No se pudo eliminar el usuario.",
        resetError: "No se pudieron regenerar las credenciales.", saved: "Ficha actualizada correctamente.",
        deleteConfirm: (name: string) => `Â¿Eliminar a ${name} del sistema del gym?`, resetConfirm: (name: string) => `Â¿Regenerar acceso temporal para ${name}?`,
        loadingTitle: "Cargando ficha del usuario", loadingDescription: "Estamos reuniendo perfil, estado del gym y progreso actual del usuario.",
        missingTitle: "No encontramos al usuario", missingDescription: "Puede que ya no pertenezca a este gym.",
        back: "Volver", description: "Ficha completa para editar cuenta, corregir asignaciones, revisar progreso y operar accesos desde el panel admin.",
        username: "Usuario", noUsername: "Sin username", regenerateAccess: "Regenerar acceso", regenerating: "Regenerando acceso...",
        delete: "Eliminar", deleting: "Eliminando...", habits: "Ejercicios", activeHabits: "activos", currentStreak: "Racha actual", best: "Mejor",
        points: "Boss Points", level: "Nivel", today: "Hoy", todayHelper: "completados / programados", accountTitle: "Cuenta y perfil",
        accountDescription: "Edita el nombre visible, username, rol y estado operativo de la cuenta dentro del gym.", fullName: "Nombre completo",
        role: "Rol", member: "Miembro", trainer: "Entrenador", admin: "Admin", status: "Estado", security: "Seguridad y cuenta",
        securityDescription: "Resumen operativo del acceso y la actividad reciente de la cuenta.", alias: "Alias", managedAccount: "Cuenta gestionada",
        yes: "Sï¿½", no: "No", lastActivity: "Ãšltima actividad", recentState: "Estado reciente", created: "Creada", lastAccess: "Ãšltimo acceso",
        assignedMembers: "Alumnos asignados", groupsInCharge: "Grupos a cargo", assignmentTitle: "Asignaciï¿½n principal",
        assignmentDescription: "Corrige entrenador, grupo y estado del seguimiento sin salir de la ficha.", assignmentTrainer: "Entrenador",
        noTrainer: "Sin entrenador", assignmentGroup: "Grupo", noGroup: "Sin grupo", assignmentStatus: "Estado", credsTitle: "Credenciales temporales nuevas",
        credsDescription: "ï¿½salas para entregar acceso actualizado al usuario desde el gym.", user: "Usuario", fullAccess: "Acceso completo",
        tempPassword: "ContraseÃ±a temporal", copied: "Copiado", linkedGroups: "Grupos vinculados", linkedGroupsDescription: "Referencia rÃ¡pida de grupos donde este usuario aparece actualmente.",
        routineTitle: "Rutina actual", routineDescription: "Ejercicios actuales del usuario cargados en su cuenta.", paused: "Pausado", noHabits: "Este usuario aÃºn no tiene ejercicios cargados en su cuenta.",
        save: "Guardar ficha", saving: "Guardando cambios...", ownersProtected: "Los owners estÃ¡n protegidos y no se eliminan desde esta vista.", noRecord: "Sin registro"
      };

  const loadDetail = async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [detailResponse, trainerRows, groupRows] = await Promise.all([
        fetchAdminUserDetail(session.access_token, userId, context.gymId),
        fetchAdminTrainers(context.gymId),
        fetchAdminGroups(context.gymId)
      ]);

      const nextDetail = detailResponse.detail;
      setDetail(nextDetail);
      setTrainers(trainerRows);
      setGroups(groupRows);
      setFullName(nextDetail.fullName);
      setUsername(nextDetail.username || "");
      setRole(nextDetail.role === "owner" ? "admin" : nextDetail.role);
      setStatus(nextDetail.status);
      setTrainerUserId(nextDetail.assignment?.trainerUserId ?? "");
      setGroupId(nextDetail.assignment?.groupId ?? "");
      setAssignmentStatus(nextDetail.assignment?.status ?? "pending");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
      setDetail(null);
      setTrainers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [context.gymId, session?.access_token, userId]);

  const handleCopy = async (value: string, field: "alias" | "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  const handleSave = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateAdminUser(session.access_token, detail.userId, {
        gymId: context.gymId,
        fullName,
        username,
        role,
        status,
        trainerUserId: role === "member" ? trainerUserId || undefined : undefined,
        groupId: role === "member" ? groupId || undefined : undefined,
        assignmentStatus: role === "member" ? assignmentStatus : undefined
      });

      const nextDetail = response.detail;
      setDetail(nextDetail);
      setFullName(nextDetail.fullName);
      setUsername(nextDetail.username || "");
      setRole(nextDetail.role === "owner" ? "admin" : nextDetail.role);
      setStatus(nextDetail.status);
      setTrainerUserId(nextDetail.assignment?.trainerUserId ?? "");
      setGroupId(nextDetail.assignment?.groupId ?? "");
      setAssignmentStatus(nextDetail.assignment?.status ?? "pending");
      setSuccessMessage(copy.saved);
      await loadDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    const confirmed = window.confirm(copy.deleteConfirm(detail.fullName));
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAdminUser(session.access_token, detail.userId, context.gymId);
      router.push(backHref);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : copy.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const handleResetCredentials = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    const confirmed = window.confirm(copy.resetConfirm(detail.fullName));
    if (!confirmed) {
      return;
    }

    setResettingCredentials(true);
    setError(null);

    try {
      const payload = await resetAdminUserCredentials(session.access_token, detail.userId, context.gymId);
      setCredentials(payload.credentials);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : copy.resetError);
    } finally {
      setResettingCredentials(false);
    }
  };

  if (loading) {
    return <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} />;
  }

  if (!detail) {
    return <AdminDataState title={copy.missingTitle} description={error ?? copy.missingDescription} actionLabel={copy.back} onAction={() => router.push("/gym/users")} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.fullName}
        description={copy.description}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.back}
          </Link>
        }
      />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={membershipStatusStyles[detail.status]}>{statusLabel(detail.status, locale)}</Badge>
              <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{roleLabel(detail.role, locale)}</Badge>
              {detail.assignment ? <Badge className="bg-surface text-card-foreground ring-1 ring-border">{assignmentLabel(detail.assignment.status, locale)}</Badge> : null}
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{detail.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.username}: {detail.username || copy.noUsername}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void handleResetCredentials()} disabled={resettingCredentials}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {resettingCredentials ? copy.regenerating : copy.regenerateAccess}
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? copy.deleting : copy.delete}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">{copy.habits}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.habitsCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail.stats.activeHabits} {copy.activeHabits}</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">{copy.currentStreak}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.currentStreak}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.best}: {detail.stats.bestStreak}</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">{copy.points}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.totalPoints}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.level} {detail.stats.level}</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">{copy.today}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.todayCompleted}/{detail.stats.todayScheduled}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.todayHelper}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>{copy.accountTitle}</CardTitle>
              <CardDescription>{copy.accountDescription}</CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="user-full-name">{copy.fullName}</Label>
                <Input id="user-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="user-username">{copy.username}</Label>
                <Input id="user-username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="username" />
              </div>
              <div>
                <Label htmlFor="user-role">{copy.role}</Label>
                <select id="user-role" className={selectClassName} value={role} onChange={(event) => setRole(event.target.value as "admin" | "trainer" | "member")}>
                  <option value="member">{copy.member}</option>
                  <option value="trainer">{copy.trainer}</option>
                  <option value="admin">{copy.admin}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="user-status">{copy.status}</Label>
                <select id="user-status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as AdminUserDetail["status"])}>
                  <option value="active">{statusLabel("active", locale)}</option>
                  <option value="invited">{statusLabel("invited", locale)}</option>
                  <option value="paused">{statusLabel("paused", locale)}</option>
                  <option value="suspended">{statusLabel("suspended", locale)}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>{copy.security}</CardTitle>
              <CardDescription>{copy.securityDescription}</CardDescription>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.alias}</span><span className="font-semibold text-card-foreground dark:text-white">{detail.alias || "N/A"}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.managedAccount}</span><span className="font-semibold text-card-foreground dark:text-white">{detail.isManagedAccount ? copy.yes : copy.no}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.lastActivity}</span><span className="text-right font-semibold text-card-foreground dark:text-white">{detail.stats.lastSyncedAt ? formatDate(detail.stats.lastSyncedAt, locale) : copy.noRecord}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.recentState}</span><span className="font-semibold text-card-foreground dark:text-white">{detail.stats.lastSaveReason || (locale === "en" ? "updated" : "actualizado")}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.created}</span><span className="text-right font-semibold text-card-foreground dark:text-white">{formatDate(detail.authCreatedAt, locale, false)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.lastAccess}</span><span className="text-right font-semibold text-card-foreground dark:text-white">{formatDate(detail.lastSignInAt, locale)}</span></div>
              {detail.trainerLoad ? <><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.assignedMembers}</span><span className="font-semibold text-card-foreground dark:text-white">{detail.trainerLoad.membersCount}</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{copy.groupsInCharge}</span><span className="font-semibold text-card-foreground dark:text-white">{detail.trainerLoad.groupsCount}</span></div></> : null}
            </div>
          </div>
        </div>

        {role === "member" ? (
          <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>{copy.assignmentTitle}</CardTitle>
              <CardDescription>{copy.assignmentDescription}</CardDescription>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="assignment-trainer">{copy.assignmentTrainer}</Label>
                <select id="assignment-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
                  <option value="">{copy.noTrainer}</option>
                  {trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="assignment-group">{copy.assignmentGroup}</Label>
                <select id="assignment-group" className={selectClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">{copy.noGroup}</option>
                  {activeGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="assignment-status">{copy.assignmentStatus}</Label>
                <select id="assignment-status" className={selectClassName} value={assignmentStatus} onChange={(event) => setAssignmentStatus(event.target.value as "active" | "pending" | "paused")}>
                  <option value="active">{assignmentLabel("active", locale)}</option>
                  <option value="pending">{assignmentLabel("pending", locale)}</option>
                  <option value="paused">{assignmentLabel("paused", locale)}</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {credentials ? (
          <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
            <div className="space-y-1">
              <CardTitle>{copy.credsTitle}</CardTitle>
              <CardDescription>{copy.credsDescription}</CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.user}</p><button type="button" onClick={() => void handleCopy(credentials.alias, "alias")} className="text-accent"><Copy className="h-4 w-4" /></button></div><div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /><span>{credentials.alias}</span></div>{copiedField === "alias" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}</div>
              <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.fullAccess}</p><button type="button" onClick={() => void handleCopy(credentials.email, "email")} className="text-accent"><Copy className="h-4 w-4" /></button></div><p className="mt-2 break-all text-sm text-muted-foreground">{credentials.email}</p>{copiedField === "email" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}</div>
              <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-card-foreground dark:text-white">{copy.tempPassword}</p><button type="button" onClick={() => void handleCopy(credentials.password, "password")} className="text-accent"><Copy className="h-4 w-4" /></button></div><div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><KeyRound className="h-4 w-4" /><span>{credentials.password}</span></div>{copiedField === "password" ? <p className="mt-2 text-xs text-accent">{copy.copied}</p> : null}</div>
            </div>
          </Card>
        ) : null}

        {detail.groups.length ? (
          <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
            <div className="space-y-1">
              <CardTitle>{copy.linkedGroups}</CardTitle>
              <CardDescription>{copy.linkedGroupsDescription}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.groups.map((group) => (
                <Link key={group.id} href={`/gym/groups/${group.id}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Users className="mr-2 h-4 w-4" />
                  {group.name}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.routineTitle}</CardTitle>
            <CardDescription>{copy.routineDescription}</CardDescription>
          </div>
          {detail.habits.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detail.habits.map((habit) => (
                <div key={habit.id} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-card-foreground dark:text-white">{habit.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)} Â· {formatSelectedDays(habit.selectedDays, locale)}</p>
                    </div>
                    <Badge className={habit.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border"}>{habit.active ? statusLabel("active", locale) : copy.paused}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {habit.category ? <span className="rounded-full border border-border px-2 py-1">{getCategoryLabel(locale, habit.category as never)}</span> : null}
                    {habit.level ? <span className="rounded-full border border-border px-2 py-1">{getLevelLabel(locale, habit.level as never)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground dark:bg-white/[0.04]">{copy.noHabits}</div>
          )}
        </Card>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {successMessage ? <div className="rounded-[20px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">{successMessage}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSave()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? copy.saving : copy.save}</Button>
          <div className="flex items-center gap-2 rounded-[18px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
            <Shield className="h-4 w-4 text-accent" />
            {copy.ownersProtected}
          </div>
        </div>
      </Card>
    </div>
  );
}

