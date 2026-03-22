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
import { useAppLocale } from "@/hooks/use-app-locale";
import { createAdminGroup } from "@/lib/supabase/admin-actions";
import { fetchAdminGroups, fetchAdminTrainers, type AdminGroupListItem, type AdminTrainerListItem } from "@/lib/supabase/admin";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

export default function AdminGroupsPage() {
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();
  const [groups, setGroups] = useState<AdminGroupListItem[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [trainerUserId, setTrainerUserId] = useState("");

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load the group list.",
          noSession: "Could not find a valid session to create groups.",
          createError: "Could not create the group.",
          title: "Groups",
          description: "Real gym cohorts with coach, schedule, members, and direct access to their operational profile.",
          createTitle: "Create group",
          createDescription:
            "Define a gym block and optionally assign it to a trainer now so it appears later in the coach panel.",
          name: "Group name",
          namePlaceholder: "Ex. Functional AM",
          schedule: "Schedule",
          schedulePlaceholder: "Ex. Mon / Wed / Fri · 6:00 a.m.",
          groupDescription: "Description",
          descriptionPlaceholder: "Goal or focus of the group",
          responsibleTrainer: "Responsible trainer",
          noTrainer: "No trainer yet",
          creating: "Creating group...",
          create: "Create group",
          viewTitle: "Group view",
          viewDescription:
            "Each group profile lets you correct the trainer, pause the block, review members, and delete it safely.",
          loadingTitle: "Loading groups",
          loadingDescription: "Fetching the real groups of the gym.",
          errorTitle: "We could not load groups",
          retry: "Retry",
          emptyTitle: "No groups in this gym yet",
          emptyDescription: "Create the first one above and it will appear here automatically.",
          manage: "Manage"
        }
      : {
          loadError: "No se pudo cargar la lista de grupos.",
          noSession: "No encontramos una sesión válida para crear grupos.",
          createError: "No se pudo crear el grupo.",
          title: "Grupos",
          description: "Cohortes reales del gym con su coach, horario, miembros y acceso directo a su ficha operativa.",
          createTitle: "Crear grupo",
          createDescription:
            "Define un bloque del gym y, si quieres, d�jalo ya asignado a un entrenador para que luego aparezca en el panel del coach.",
          name: "Nombre del grupo",
          namePlaceholder: "Ej. Functional AM",
          schedule: "Horario",
          schedulePlaceholder: "Ej. Lun / Mié / Vie · 6:00 a.m.",
          groupDescription: "Descripción",
          descriptionPlaceholder: "Objetivo o foco del grupo",
          responsibleTrainer: "Entrenador responsable",
          noTrainer: "Sin entrenador aún",
          creating: "Creando grupo...",
          create: "Crear grupo",
          viewTitle: "Vista de grupos",
          viewDescription:
            "Cada ficha de grupo te permite corregir entrenador, pausar el bloque, revisar miembros y eliminarlo de forma segura.",
          loadingTitle: "Cargando grupos",
          loadingDescription: "Estamos consultando los grupos reales del gimnasio.",
          errorTitle: "No pudimos cargar los grupos",
          retry: "Reintentar",
          emptyTitle: "Aún no hay grupos en este gym",
          emptyDescription: "Crea el primero arriba y aparecer� aquí automáticamente.",
          manage: "Gestionar"
        };

  const loadGroups = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextGroups, nextTrainers] = await Promise.all([fetchAdminGroups(context.gymId), fetchAdminTrainers(context.gymId)]);
      setGroups(nextGroups);
      setTrainers(nextTrainers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
      setError(copy.noSession);
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
      setError(createError instanceof Error ? createError.message : copy.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.createTitle}</CardTitle>
          <CardDescription>{copy.createDescription}</CardDescription>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="group-name">{copy.name}</Label>
            <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} />
          </div>
          <div>
            <Label htmlFor="group-schedule">{copy.schedule}</Label>
            <Input id="group-schedule" value={scheduleText} onChange={(event) => setScheduleText(event.target.value)} placeholder={copy.schedulePlaceholder} />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="group-description">{copy.groupDescription}</Label>
            <Input id="group-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={copy.descriptionPlaceholder} />
          </div>
          <div>
            <Label htmlFor="group-trainer">{copy.responsibleTrainer}</Label>
            <select id="group-trainer" className={selectClassName} value={trainerUserId} onChange={(event) => setTrainerUserId(event.target.value)}>
              <option value="">{copy.noTrainer}</option>
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
            {submitting ? copy.creating : copy.create}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Layers3 className="h-4 w-4 text-accent" />
          <span className="text-sm">{copy.viewTitle}</span>
        </div>
        <p className="text-sm text-muted-foreground">{copy.viewDescription}</p>
      </Card>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && error ? <AdminDataState title={copy.errorTitle} description={error} actionLabel={copy.retry} onAction={() => void loadGroups()} tone="warning" /> : null}
      {!loading && !error && groups.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

      {!loading && !error && groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <AdminGroupCard
              key={group.id}
              group={group}
              action={
                <Link href={`/gym/groups/${group.id}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  {copy.manage}
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
