"use client";

import { useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BarChart3, Flame, Target, Users } from "lucide-react";

import { CoachHabitEditor } from "@/components/coach/coach-habit-editor";
import { CoachMemberCard } from "@/components/coach/coach-member-card";
import { useCoachContext } from "@/components/coach/coach-access-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import {
  createCoachHabit,
  deleteCoachHabit,
  fetchCoachOverview,
  updateCoachHabit,
  type CoachMemberOverview,
  type CoachOverviewResponse
} from "@/lib/supabase/coach";
import type { HabitFormValues } from "@/lib/validation/habit";

function buildCoachHref(view: "summary" | "members" | "training", memberId?: string | null) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (memberId) {
    params.set("member", memberId);
  }
  return `/coach?${params.toString()}`;
}

function SummaryMetric({ title, value, helper, tone }: { title: string; value: string; helper: string; tone: string }) {
  return (
    <Card className="rounded-[28px] border bg-[#0F151E] p-5 text-white">
      <div className="text-sm font-semibold" style={{ color: tone }}>{title}</div>
      <p className="mt-4 font-display text-4xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/58">{helper}</p>
    </Card>
  );
}

export default function CoachPage() {
  const { context } = useCoachContext();
  const { session } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [overview, setOverview] = useState<CoachOverviewResponse | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentView = (searchParams.get("view") as "summary" | "members" | "training" | null) ?? "summary";
  const queryMemberId = searchParams.get("member");

  const updateView = (view: "summary" | "members" | "training", memberId?: string | null) => {
    router.replace(buildCoachHref(view, memberId ?? selectedMemberId), { scroll: false });
  };

  const loadOverview = async (showSkeleton = false) => {
    if (!session?.access_token) {
      return;
    }

    if (showSkeleton) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const data = await fetchCoachOverview(session.access_token, context.gymId);
      setOverview(data);
      setSelectedMemberId((current) => queryMemberId ?? current ?? data.members[0]?.userId ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel del coach.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOverview(true);
  }, [context.gymId, session?.access_token]);

  useEffect(() => {
    if (queryMemberId) {
      setSelectedMemberId(queryMemberId);
    }
  }, [queryMemberId]);

  const selectedMember = useMemo<CoachMemberOverview | null>(() => {
    if (!overview?.members.length) {
      return null;
    }

    return overview.members.find((member) => member.userId === selectedMemberId) ?? overview.members[0] ?? null;
  }, [overview?.members, selectedMemberId]);

  useEffect(() => {
    if (!overview?.members.length) {
      return;
    }

    const exists = overview.members.some((member) => member.userId === selectedMemberId);
    if (!exists) {
      setSelectedMemberId(overview.members[0]?.userId ?? null);
    }
  }, [overview?.members, selectedMemberId]);

  const handleCreateHabit = async (values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de crear un entrenamiento.");
    }

    setMutating(true);
    try {
      await createCoachHabit(session.access_token, selectedMember.userId, values);
      await loadOverview(false);
    } finally {
      setMutating(false);
    }
  };

  const handleUpdateHabit = async (habitId: string, values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de editar un entrenamiento.");
    }

    setMutating(true);
    try {
      await updateCoachHabit(session.access_token, selectedMember.userId, habitId, values);
      await loadOverview(false);
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de eliminar un entrenamiento.");
    }

    setMutating(true);
    try {
      await deleteCoachHabit(session.access_token, selectedMember.userId, habitId);
      await loadOverview(false);
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return <LoadingScreen title="Preparando panel del entrenador..." />;
  }

  const hero = (
    <section className="space-y-4 rounded-[34px] border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">Coach HQ</p>
          <h1 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold text-card-foreground">
            Tus alumnos y sus entrenamientos, en un solo lugar.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Revisa quién entrenó hoy, qué progreso lleva cada alumno y ajusta sus hábitos reales sin tocar la experiencia móvil de BossFit.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void loadOverview(false)} disabled={refreshing}>
          {refreshing ? "Actualizando..." : "Actualizar datos"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-[24px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <SummaryMetric title="Asignados" value={String(overview?.summary.assignedMembers ?? 0)} helper="alumnos bajo tu seguimiento directo" tone="#67e8f9" />
        <SummaryMetric title="Completados hoy" value={String(overview?.summary.completedToday ?? 0)} helper="alumnos cumplieron todo su día" tone="#6ee7b7" />
        <SummaryMetric title="Cumplimiento medio" value={`${overview?.summary.averageCompliance ?? 0}%`} helper="últimos 7 días de tus asignados" tone="#fcd34d" />
        <SummaryMetric title="Racha media" value={String(overview?.summary.averageStreak ?? 0)} helper="días consecutivos de consistencia" tone="#fda4af" />
      </div>
    </section>
  );

  const membersList = overview?.members.length ? (
    <div className="space-y-4">
      {overview.members.map((member) => (
        <CoachMemberCard
          key={member.userId}
          member={member}
          selected={selectedMember?.userId === member.userId}
          onSelect={() => setSelectedMemberId(member.userId)}
        />
      ))}
    </div>
  ) : (
    <Card className="rounded-[30px] border border-dashed border-border bg-surface p-6">
      <CardTitle>No tienes alumnos asignados todavía</CardTitle>
      <CardDescription className="mt-2">
        Cuando el admin del gym te asigne miembros, aparecerán aquí con su progreso real y podrás gestionar sus entrenamientos.
      </CardDescription>
    </Card>
  );

  const summaryView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Alumnos asignados</h2>
              <p className="text-sm text-muted-foreground">Selecciona un alumno para revisar progreso y ajustar sus entrenamientos reales.</p>
            </div>
            <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-card-foreground">
              {overview?.members.length ?? 0} activos
            </span>
          </div>
          {membersList}
        </section>

        <section className="space-y-5">
          <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
            <CardTitle className="text-white">Vista rápida</CardTitle>
            <CardDescription className="mt-1 text-white/60">
              Abre alumnos para revisar su estado o entra a entrenamientos para crear y ajustar hábitos programados.
            </CardDescription>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => updateView("members", selectedMember?.userId)}>
                Ver alumnos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="secondary" className="bg-white/8 text-white ring-white/10 hover:bg-white/12" onClick={() => updateView("training", selectedMember?.userId)}>
                Gestionar entrenamientos
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );

  const membersView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Alumnos asignados</h2>
              <p className="text-sm text-muted-foreground">Haz clic en un alumno para enfocarlo y luego pasar a su editor.</p>
            </div>
          </div>
          {membersList}
        </section>

        <section className="space-y-5">
          {selectedMember ? (
            <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
              <CardTitle className="text-white">{selectedMember.name}</CardTitle>
              <CardDescription className="mt-1 text-white/60">
                {selectedMember.groupName} · {selectedMember.planName} · {selectedMember.completedToday}/{selectedMember.scheduledToday} hoy
              </CardDescription>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                  <p className="text-sm text-white/48">Racha actual</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-white">{selectedMember.currentStreak}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                  <p className="text-sm text-white/48">Cumplimiento semanal</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-white">{selectedMember.weeklyCompliance}%</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => updateView("training", selectedMember.userId)}>
                  Gestionar entrenamientos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
              <CardTitle className="text-white">Sin alumno seleccionado</CardTitle>
              <CardDescription className="text-white/60">
                Selecciona un alumno de la izquierda para revisar su progreso.
              </CardDescription>
            </Card>
          )}
        </section>
      </div>
    </div>
  );

  const trainingView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Selecciona un alumno</h2>
              <p className="text-sm text-muted-foreground">El editor de la derecha escribe directamente en los hábitos reales del alumno.</p>
            </div>
          </div>
          {membersList}
        </section>

        <section>
          <CoachHabitEditor
            member={selectedMember}
            busy={mutating || refreshing}
            onCreate={handleCreateHabit}
            onUpdate={handleUpdateHabit}
            onDelete={handleDeleteHabit}
          />
        </section>
      </div>
    </div>
  );

  if (currentView === "members") {
    return membersView;
  }

  if (currentView === "training") {
    return trainingView;
  }

  return summaryView;
}
