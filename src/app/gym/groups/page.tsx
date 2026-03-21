"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Eye, Layers3, PlusCircle } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminGroupCard } from "@/components/admin/admin-group-card";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAdminGroup } from "@/lib/supabase/admin-actions";
import { fetchAdminGroups, fetchAdminTrainers, type AdminGroupListItem, type AdminTrainerListItem } from "@/lib/supabase/admin";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

export default function AdminGroupsPage() {
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const [groups, setGroups] = useState<AdminGroupListItem[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [trainerUserId, setTrainerUserId] = useState("");

  const loadGroups = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextGroups, nextTrainers] = await Promise.all([
        fetchAdminGroups(context.gymId),
        fetchAdminTrainers(context.gymId)
      ]);
      setGroups(nextGroups);
      setTrainers(nextTrainers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de grupos.");
      setGroups([]);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [context.gymId]);

  const handleCreateGroup = async () => {
    if (!session?.access_token) {
      setError("No encontramos una sesión válida para crear grupos.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createAdminGroup(session.access_token, {
        gymId: context.gymId,
        name,
        description: description || undefined,
        trainerUserId: trainerUserId || undefined,
        scheduleText: scheduleText || undefined,
        active: true
      });

      setName("");
      setDescription("");
      setScheduleText("");
      setTrainerUserId("");
      await loadGroups();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Grupos" description="Cohortes reales del gym con su coach, horario, miembros y acceso directo a su ficha operativa." />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Crear grupo</CardTitle>
          <CardDescription>
            Define un bloque del gym y, si quieres, déjalo ya asignado a un entrenador para que luego aparezca en el panel del coach.
          </CardDescription>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="group-name">Nombre del grupo</Label>
            <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Functional AM" />
          </div>
          <div>
            <Label htmlFor="group-schedule">Horario</Label>
            <Input id="group-schedule" value={scheduleText} onChange={(event) => setScheduleText(event.target.value)} placeholder="Ej. Lun / Mié / Vie · 6:00 a.m." />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="group-description">Descripción</Label>
            <Input id="group-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo o foco del grupo" />
          </div>
          <div>
            <Label htmlFor="group-trainer">Entrenador responsable</Label>
            <select id="group-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
              <option value="">Sin entrenador aún</option>
              {trainers.map((trainer) => (
                <option key={trainer.userId} value={trainer.userId}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleCreateGroup()} disabled={submitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {submitting ? "Creando grupo..." : "Crear grupo"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Layers3 className="h-4 w-4 text-accent" />
          <span className="text-sm">Vista de grupos</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Cada ficha de grupo te permite corregir entrenador, pausar el bloque, revisar miembros y eliminarlo de forma segura.
        </p>
      </Card>

      {loading ? <AdminDataState title="Cargando grupos" description="Estamos consultando los grupos reales del gimnasio." /> : null}
      {!loading && error ? <AdminDataState title="No pudimos cargar los grupos" description={error} actionLabel="Reintentar" onAction={() => void loadGroups()} tone="warning" /> : null}
      {!loading && !error && groups.length === 0 ? <AdminDataState title="Aún no hay grupos en este gym" description="Crea el primero arriba y aparecerá aquí automáticamente." /> : null}

      {!loading && !error && groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <AdminGroupCard
              key={group.id}
              group={group}
              action={
                <Link href={`/gym/groups/${group.id}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  Gestionar
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

