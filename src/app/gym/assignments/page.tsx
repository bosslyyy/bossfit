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
import { useAppLocale } from "@/hooks/use-app-locale";
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
  const locale = useAppLocale();
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

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load the assignment list.",
          noSession: "Could not find a valid session to update the assignment.",
          saveError: "Could not update the assignment.",
          title: "Assignments",
          description: "Real relationship between member, trainer, group, and plan inside the gym.",
          boardState: "Board state",
          usage: "Real usage",
          usageDescription:
            "When you assign a member to a coach and group here, the coach panel is automatically fed with those members.",
          editTitle: "Edit assignment",
          editDescription:
            "Define the member's main trainer and group. You can also open the full profile to edit the whole account.",
          member: "Member",
          trainer: "Trainer",
          noTrainer: "No trainer",
          group: "Group",
          noGroup: "No group",
          status: "Status",
          active: "Active",
          pending: "Pending",
          paused: "Paused",
          saving: "Saving...",
          save: "Save assignment",
          openUser: "Open user profile",
          loadingTitle: "Loading assignments",
          loadingDescription: "Collecting active assignments and their details.",
          errorTitle: "We could not load assignments",
          retry: "Retry",
          emptyTitle: "No assignments in this gym yet",
          emptyDescription: "When you create members in the gym, they will appear here automatically so you can place them with a coach and group.",
          profile: "Profile"
        }
      : {
          loadError: "No se pudo cargar la lista de asignaciones.",
          noSession: "No encontramos una sesión válida para actualizar la asignación.",
          saveError: "No se pudo actualizar la asignación.",
          title: "Asignaciones",
          description: "Relaci�n real entre miembro, entrenador, grupo y plan dentro del gimnasio.",
          boardState: "Estado del tablero",
          usage: "Uso real",
          usageDescription:
            "Cuando asignas un miembro a un coach y grupo aquí, el panel del entrenador se alimenta automáticamente con esos alumnos.",
          editTitle: "Editar asignación",
          editDescription:
            "Define el entrenador y grupo principal del miembro. También puedes abrir su ficha completa para editar la cuenta entera.",
          member: "Miembro",
          trainer: "Entrenador",
          noTrainer: "Sin entrenador",
          group: "Grupo",
          noGroup: "Sin grupo",
          status: "Estado",
          active: "Activa",
          pending: "Pendiente",
          paused: "Pausada",
          saving: "Guardando...",
          save: "Guardar asignación",
          openUser: "Abrir ficha del usuario",
          loadingTitle: "Cargando asignaciones",
          loadingDescription: "Estamos reuniendo las asignaciones activas y sus detalles.",
          errorTitle: "No pudimos cargar las asignaciones",
          retry: "Reintentar",
          emptyTitle: "Aún no hay asignaciones en este gym",
          emptyDescription: "Cuando crees miembros en el gym, aparecer�n aquí automáticamente para poder ubicarlos con un coach y un grupo.",
          profile: "Ficha"
        };

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
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
      setError(copy.noSession);
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
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4 text-accent" />
            <span className="text-sm">{copy.boardState}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]">{copy.active}</Badge>
            <Badge className="bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]">{copy.pending}</Badge>
            <Badge className="bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]">{copy.paused}</Badge>
          </div>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRightLeft className="h-4 w-4 text-accent" />
            <span className="text-sm">{copy.usage}</span>
          </div>
          <p className="text-sm text-muted-foreground">{copy.usageDescription}</p>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.editTitle}</CardTitle>
          <CardDescription>{copy.editDescription}</CardDescription>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-4">
            <Label htmlFor="assignment-id">{copy.member}</Label>
            <select id="assignment-id" className={selectClassName} value={selectedAssignment?.id ?? ""} onChange={(event) => setSelectedAssignmentId(event.target.value)}>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.memberName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="assignment-trainer">{copy.trainer}</Label>
            <select id="assignment-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
              <option value="">{copy.noTrainer}</option>
              {trainers.map((trainer) => (
                <option key={trainer.userId} value={trainer.userId}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="assignment-group">{copy.group}</Label>
            <select id="assignment-group" className={selectClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">{copy.noGroup}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="assignment-status">{copy.status}</Label>
            <select id="assignment-status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as "active" | "pending" | "paused")}>
              <option value="active">{copy.active}</option>
              <option value="pending">{copy.pending}</option>
              <option value="paused">{copy.paused}</option>
            </select>
          </div>
        </div>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSave()} disabled={saving || !selectedAssignment}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? copy.saving : copy.save}
          </Button>
          {selectedAssignment ? (
            <Link href={`/gym/users/${selectedAssignment.memberUserId}`} className={buttonVariants({ variant: "outline" })}>
              <Eye className="mr-2 h-4 w-4" />
              {copy.openUser}
            </Link>
          ) : null}
        </div>
      </Card>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && error ? <AdminDataState title={copy.errorTitle} description={error} actionLabel={copy.retry} onAction={() => void loadAssignments()} tone="warning" /> : null}
      {!loading && !error && assignments.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

      {!loading && !error && assignments.length ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <AdminAssignmentCard
              key={assignment.id}
              assignment={assignment}
              action={
                <Link href={`/gym/users/${assignment.memberUserId}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  {copy.profile}
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
