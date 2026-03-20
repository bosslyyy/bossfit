"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Users } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteAdminGroup, fetchAdminGroupDetail, updateAdminGroup } from "@/lib/supabase/admin-actions";
import { fetchAdminTrainers, type AdminGroupDetail, type AdminTrainerListItem } from "@/lib/supabase/admin";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

export default function AdminGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();

  const [detail, setDetail] = useState<AdminGroupDetail | null>(null);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [trainerUserId, setTrainerUserId] = useState("");
  const [active, setActive] = useState(true);

  const groupId = params.groupId;
  const activeMembers = useMemo(() => detail?.members.filter((member) => member.status === "active") ?? [], [detail?.members]);

  const loadDetail = async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [detailResponse, trainerRows] = await Promise.all([
        fetchAdminGroupDetail(session.access_token, groupId, context.gymId),
        fetchAdminTrainers(context.gymId)
      ]);
      const nextDetail = detailResponse.detail;
      setDetail(nextDetail);
      setTrainers(trainerRows);
      setName(nextDetail.name);
      setDescription(nextDetail.description);
      setScheduleText(nextDetail.scheduleText);
      setTrainerUserId(nextDetail.trainerUserId ?? "");
      setActive(nextDetail.active);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha del grupo.");
      setDetail(null);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [context.gymId, groupId, session?.access_token]);

  const handleSave = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateAdminGroup(session.access_token, detail.id, {
        gymId: context.gymId,
        name,
        description,
        trainerUserId: trainerUserId || undefined,
        scheduleText,
        active
      });
      if (response.detail) {
        setDetail(response.detail);
      }
      setSuccessMessage("Grupo actualizado correctamente.");
      await loadDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el grupo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar el grupo ${detail.name}? Los miembros quedarán sin grupo principal.`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAdminGroup(session.access_token, detail.id, context.gymId);
      router.push("/admin/groups");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el grupo.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <AdminDataState title="Cargando ficha del grupo" description="Estamos reuniendo entrenador, miembros y estado operativo desde Supabase." />;
  }

  if (!detail) {
    return <AdminDataState title="No encontramos el grupo" description={error ?? "Puede que ya no exista o se haya eliminado."} actionLabel="Volver" onAction={() => router.push("/admin/groups")} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.name}
        description="Edita grupo, entrenador responsable, estado y revisa su roster completo de miembros desde el admin."
        action={
          <Link href="/admin/groups" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        }
      />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={detail.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border dark:bg-white/[0.08] dark:text-white/80"}>
                {detail.active ? "Activo" : "Pausado"}
              </Badge>
              <Badge className="bg-surface text-card-foreground ring-1 ring-border">{detail.membersCount} miembros</Badge>
              <Badge className="bg-surface text-card-foreground ring-1 ring-border">{activeMembers.length} activos</Badge>
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Coach actual: {detail.trainerName}</p>
            </div>
          </div>

          <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar grupo"}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>Configuración del grupo</CardTitle>
              <CardDescription>Actualiza nombre, foco operativo, horario y entrenador responsable.</CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="group-name">Nombre</Label>
                <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="group-description">Descripción</Label>
                <Input id="group-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo o foco del grupo" />
              </div>
              <div>
                <Label htmlFor="group-schedule">Horario</Label>
                <Input id="group-schedule" value={scheduleText} onChange={(event) => setScheduleText(event.target.value)} placeholder="Ej. Lun / Mié / Vie · 6:00 a.m." />
              </div>
              <div>
                <Label htmlFor="group-trainer">Entrenador</Label>
                <select id="group-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
                  <option value="">Sin entrenador</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.userId} value={trainer.userId}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[20px] border border-border bg-card px-4 py-3 dark:bg-[#121922]">
              <div>
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Grupo activo</p>
                <p className="text-sm text-muted-foreground">Si lo pausas, seguirá visible pero ya no se propondrá como grupo operativo.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} ariaLabel="Activar o pausar grupo" />
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
            <div className="space-y-1">
              <CardTitle>Resumen del grupo</CardTitle>
              <CardDescription>Información rápida para validar carga y composición del bloque.</CardDescription>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Miembros</span>
                <span className="font-semibold text-card-foreground dark:text-white">{detail.membersCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Miembros activos</span>
                <span className="font-semibold text-card-foreground dark:text-white">{activeMembers.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Entrenador</span>
                <span className="text-right font-semibold text-card-foreground dark:text-white">{detail.trainerName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Creado</span>
                <span className="text-right font-semibold text-card-foreground dark:text-white">{detail.createdAt ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(detail.createdAt)) : "Sin fecha"}</span>
              </div>
            </div>
          </div>
        </div>

        <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Miembros del grupo</CardTitle>
            <CardDescription>Acceso directo a las fichas para corregir asignaciones y editar sus datos.</CardDescription>
          </div>
          {detail.members.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detail.members.map((member) => (
                <div key={member.userId} className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-card-foreground dark:text-white">{member.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge className={member.status === "active" ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border"}>
                      {member.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Asignación</span>
                    <span className="font-semibold text-card-foreground dark:text-white">{member.assignmentStatus}</span>
                  </div>
                  <Link href={`/admin/users/${member.userId}`} className={buttonVariants({ variant: "outline", className: "mt-4 h-10 w-full" })}>
                    <Users className="mr-2 h-4 w-4" />
                    Abrir ficha
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground dark:bg-white/[0.04]">
              Este grupo todavía no tiene miembros vinculados.
            </div>
          )}
        </Card>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {successMessage ? <div className="rounded-[20px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">{successMessage}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando cambios..." : "Guardar grupo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
