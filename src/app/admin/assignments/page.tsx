"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { ArrowRightLeft, ClipboardList, Eye, Save } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminAssignmentCard } from "@/components/admin/admin-assignment-card";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateAdminAssignment } from "@/lib/supabase/admin-actions";
import {
  fetchAdminAssignments,
  fetchAdminGroups,
  fetchAdminTrainers,
  type AdminAssignmentListItem,
  type AdminGroupListItem,
  type AdminTrainerListItem
} from "@/lib/supabase/admin";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

export default function AdminAssignmentsPage() {
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const [assignments, setAssignments] = useState<AdminAssignmentListItem[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [groups, setGroups] = useState<AdminGroupListItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [trainerUserId, setTrainerUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<"active" | "pending" | "paused">("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextAssignments, nextTrainers, nextGroups] = await Promise.all([
        fetchAdminAssignments(context.gymId),
        fetchAdminTrainers(context.gymId),
        fetchAdminGroups(context.gymId)
      ]);
      setAssignments(nextAssignments);
      setTrainers(nextTrainers);
      setGroups(nextGroups.filter((group) => group.active));
      setSelectedAssignmentId((current) => current || nextAssignments[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de asignaciones.");
      setAssignments([]);
      setTrainers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, [context.gymId]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0] ?? null,
    [assignments, selectedAssignmentId]
  );

  useEffect(() => {
    if (!selectedAssignment) {
      setTrainerUserId("");
      setGroupId("");
      setStatus("pending");
      return;
    }

    setTrainerUserId(selectedAssignment.trainerUserId ?? "");
    setGroupId(selectedAssignment.groupId ?? "");
    setStatus(selectedAssignment.status);
  }, [selectedAssignment]);

  const handleSave = async () => {
    if (!session?.access_token || !selectedAssignment) {
      setError("No encontramos una sesión válida para actualizar la asignación.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateAdminAssignment(session.access_token, selectedAssignment.id, {
        trainerUserId: trainerUserId || undefined,
        groupId: groupId || undefined,
        status
      });
      await loadAssignments();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la asignación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Asignaciones" description="Relación real entre miembro, entrenador, grupo y plan dentro del gimnasio." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4 text-accent" />
            <span className="text-sm">Estado del tablero</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]">Activa</Badge>
            <Badge className="bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]">Pendiente</Badge>
            <Badge className="bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]">Pausada</Badge>
          </div>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRightLeft className="h-4 w-4 text-accent" />
            <span className="text-sm">Uso real</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Cuando asignas un miembro a un coach y grupo aquí, el panel del entrenador se alimenta automáticamente con esos alumnos.
          </p>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Editar asignación</CardTitle>
          <CardDescription>
            Define el entrenador y grupo principal del miembro. También puedes abrir su ficha completa para editar la cuenta entera.
          </CardDescription>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-4">
            <Label htmlFor="assignment-id">Miembro</Label>
            <select id="assignment-id" className={selectClassName} value={selectedAssignment?.id ?? ""} onChange={(event) => setSelectedAssignmentId(event.target.value)}>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.memberName}
                </option>
              ))}
            </select>
          </div>
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
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="assignment-status">Estado</Label>
            <select id="assignment-status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as "active" | "pending" | "paused")}>
              <option value="active">Activa</option>
              <option value="pending">Pendiente</option>
              <option value="paused">Pausada</option>
            </select>
          </div>
        </div>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSave()} disabled={saving || !selectedAssignment}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar asignación"}
          </Button>
          {selectedAssignment ? (
            <Link href={`/admin/users/${selectedAssignment.memberUserId}`} className={buttonVariants({ variant: "outline" })}>
              <Eye className="mr-2 h-4 w-4" />
              Abrir ficha del usuario
            </Link>
          ) : null}
        </div>
      </Card>

      {loading ? <AdminDataState title="Cargando asignaciones" description="Estamos reuniendo las asignaciones activas y sus detalles." /> : null}
      {!loading && error ? <AdminDataState title="No pudimos cargar las asignaciones" description={error} actionLabel="Reintentar" onAction={() => void loadAssignments()} tone="warning" /> : null}
      {!loading && !error && assignments.length === 0 ? <AdminDataState title="Aún no hay asignaciones en este gym" description="Cuando crees miembros en el gym, aparecerán aquí automáticamente para poder ubicarlos con un coach y un grupo." /> : null}

      {!loading && !error && assignments.length ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <AdminAssignmentCard
              key={assignment.id}
              assignment={assignment}
              action={
                <Link href={`/admin/users/${assignment.memberUserId}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ficha
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

