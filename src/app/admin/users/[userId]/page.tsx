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
import {
  deleteAdminUser,
  fetchAdminUserDetail,
  resetAdminUserCredentials,
  updateAdminUser,
  type AdminCredentialResetResult
} from "@/lib/supabase/admin-actions";
import { fetchAdminGroups, fetchAdminTrainers, type AdminGroupListItem, type AdminTrainerListItem, type AdminUserDetail } from "@/lib/supabase/admin";
import { WEEK_DAYS } from "@/lib/constants";
import { formatHabitTarget, titleCase } from "@/lib/utils";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

const membershipStatusStyles: Record<AdminUserDetail["status"], string> = {
  active: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
  invited: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
  paused: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
  suspended: "bg-[#FFF0F0] text-[#B44141] dark:bg-[#2B1515] dark:text-[#FF9A9A]"
};

const assignmentStatusLabel = {
  active: "Activa",
  pending: "Pendiente",
  paused: "Pausada"
} as const;

function formatSelectedDays(selectedDays: string[]) {
  return WEEK_DAYS.filter((day) => selectedDays.includes(day.key)).map((day) => day.short).join(" · ");
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();

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

  const backHref = detail?.role === "trainer" ? "/admin/trainers" : "/admin/users";
  const activeGroups = useMemo(() => groups.filter((group) => group.active), [groups]);

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
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha del usuario.");
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
      setSuccessMessage("Ficha actualizada correctamente.");
      await loadDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la ficha.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar a ${detail.fullName} del sistema del gym?`);
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
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetCredentials = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    const confirmed = window.confirm(`¿Regenerar acceso temporal para ${detail.fullName}?`);
    if (!confirmed) {
      return;
    }

    setResettingCredentials(true);
    setError(null);

    try {
      const payload = await resetAdminUserCredentials(session.access_token, detail.userId);
      setCredentials(payload.credentials);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "No se pudieron regenerar las credenciales.");
    } finally {
      setResettingCredentials(false);
    }
  };

  if (loading) {
    return <AdminDataState title="Cargando ficha del usuario" description="Estamos reuniendo perfil, estado del gym y progreso actual del usuario." />;
  }

  if (!detail) {
    return <AdminDataState title="No encontramos al usuario" description={error ?? "Puede que ya no pertenezca a este gym."} actionLabel="Volver" onAction={() => router.push("/admin/users")} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.fullName}
        description="Ficha completa para editar cuenta, corregir asignaciones, revisar progreso y operar accesos desde el panel admin."
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        }
      />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={membershipStatusStyles[detail.status]}>{detail.status}</Badge>
              <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{titleCase(detail.role)}</Badge>
              {detail.assignment ? <Badge className="bg-surface text-card-foreground ring-1 ring-border">{assignmentStatusLabel[detail.assignment.status]}</Badge> : null}
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{detail.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">Usuario: {detail.username || "Sin username"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void handleResetCredentials()} disabled={resettingCredentials}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {resettingCredentials ? "Regenerando acceso..." : "Regenerar acceso"}
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">Hábitos</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.habitsCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail.stats.activeHabits} activos</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">Racha actual</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.currentStreak}</p>
            <p className="mt-1 text-sm text-muted-foreground">Mejor: {detail.stats.bestStreak}</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">Boss Points</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.totalPoints}</p>
            <p className="mt-1 text-sm text-muted-foreground">Nivel {detail.stats.level}</p>
          </Card>
          <Card className="border border-border bg-background/80 dark:bg-white/[0.04]">
            <p className="text-sm text-muted-foreground">Hoy</p>
            <p className="mt-2 font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.stats.todayCompleted}/{detail.stats.todayScheduled}</p>
            <p className="mt-1 text-sm text-muted-foreground">completados / programados</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>Cuenta y perfil</CardTitle>
              <CardDescription>Edita el nombre visible, username, rol y estado operativo de la cuenta dentro del gym.</CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="user-full-name">Nombre completo</Label>
                <Input id="user-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="user-username">Username</Label>
                <Input id="user-username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="usuario" />
              </div>
              <div>
                <Label htmlFor="user-role">Rol</Label>
                <select id="user-role" className={selectClassName} value={role} onChange={(event) => setRole(event.target.value as "admin" | "trainer" | "member")}>
                  <option value="member">Miembro</option>
                  <option value="trainer">Entrenador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="user-status">Estado</Label>
                <select id="user-status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as AdminUserDetail["status"])}>
                  <option value="active">Activo</option>
                  <option value="invited">Invitado</option>
                  <option value="paused">Pausado</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>Seguridad y cuenta</CardTitle>
              <CardDescription>Resumen operativo del acceso y la actividad reciente de la cuenta.</CardDescription>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Alias</span>
                <span className="font-semibold text-card-foreground dark:text-white">{detail.alias || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Cuenta gestionada</span>
                <span className="font-semibold text-card-foreground dark:text-white">{detail.isManagedAccount ? "Sí" : "No"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Última actividad</span>
                <span className="text-right font-semibold text-card-foreground dark:text-white">{detail.stats.lastSyncedAt ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.stats.lastSyncedAt)) : "Sin registro"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Estado reciente</span>
                <span className="font-semibold text-card-foreground dark:text-white">{detail.stats.lastSaveReason || "actualizado"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Creada</span>
                <span className="text-right font-semibold text-card-foreground dark:text-white">{detail.authCreatedAt ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(detail.authCreatedAt)) : "Sin dato"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Último acceso</span>
                <span className="text-right font-semibold text-card-foreground dark:text-white">{detail.lastSignInAt ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.lastSignInAt)) : "Sin dato"}</span>
              </div>
              {detail.trainerLoad ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Alumnos asignados</span>
                    <span className="font-semibold text-card-foreground dark:text-white">{detail.trainerLoad.membersCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Grupos a cargo</span>
                    <span className="font-semibold text-card-foreground dark:text-white">{detail.trainerLoad.groupsCount}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {role === "member" ? (
          <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>Asignación principal</CardTitle>
              <CardDescription>Corrige entrenador, grupo y estado del seguimiento sin salir de la ficha.</CardDescription>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="assignment-trainer">Entrenador</Label>
                <select id="assignment-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
                  <option value="">Sin entrenador</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.userId} value={trainer.userId}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="assignment-group">Grupo</Label>
                <select id="assignment-group" className={selectClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">Sin grupo</option>
                  {activeGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="assignment-status">Estado</Label>
                <select id="assignment-status" className={selectClassName} value={assignmentStatus} onChange={(event) => setAssignmentStatus(event.target.value as "active" | "pending" | "paused")}>
                  <option value="active">Activa</option>
                  <option value="pending">Pendiente</option>
                  <option value="paused">Pausada</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {credentials ? (
          <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
            <div className="space-y-1">
              <CardTitle>Credenciales temporales nuevas</CardTitle>
              <CardDescription>Úsalas para entregar acceso actualizado al usuario desde el gym.</CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
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
              <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
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

        {detail.groups.length ? (
          <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
            <div className="space-y-1">
              <CardTitle>Grupos vinculados</CardTitle>
              <CardDescription>Referencia rápida de grupos donde este usuario aparece actualmente.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.groups.map((group) => (
                <Link key={group.id} href={`/admin/groups/${group.id}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Users className="mr-2 h-4 w-4" />
                  {group.name}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Rutina actual</CardTitle>
            <CardDescription>Hábitos actuales del usuario cargados en su cuenta.</CardDescription>
          </div>
          {detail.habits.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detail.habits.map((habit) => (
                <div key={habit.id} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-card-foreground dark:text-white">{habit.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)} · {formatSelectedDays(habit.selectedDays)}</p>
                    </div>
                    <Badge className={habit.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border"}>
                      {habit.active ? "Activo" : "Pausado"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {habit.category ? <span className="rounded-full border border-border px-2 py-1">{titleCase(habit.category)}</span> : null}
                    {habit.level ? <span className="rounded-full border border-border px-2 py-1">{titleCase(habit.level)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground dark:bg-white/[0.04]">
              Este usuario aún no tiene hábitos cargados en su cuenta.
            </div>
          )}
        </Card>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {successMessage ? <div className="rounded-[20px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">{successMessage}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando cambios..." : "Guardar ficha"}
          </Button>
          <div className="flex items-center gap-2 rounded-[18px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
            <Shield className="h-4 w-4 text-accent" />
            Los owners están protegidos y no se eliminan desde esta vista.
          </div>
        </div>
      </Card>
    </div>
  );
}





