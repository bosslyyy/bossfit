"use client";

import { useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { useCoachContext } from "@/components/coach/coach-access-gate";
import { CoachHabitEditor } from "@/components/coach/coach-habit-editor";
import { CoachMemberCard } from "@/components/coach/coach-member-card";
import { CoachMemberDetailPanel } from "@/components/coach/coach-member-detail-panel";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  createCoachAlert,
  createCoachHabit,
  createCoachNote,
  deleteCoachHabit,
  fetchCoachMemberDetail,
  fetchCoachOverview,
  sendCoachMessage,
  updateCoachAlert,
  updateCoachHabit,
  updateCoachNote,
  type CoachMemberOverview,
  type CoachOverviewResponse
} from "@/lib/supabase/coach";
import { formatHabitTarget } from "@/lib/utils";
import type { CoachAlert, CoachMemberDetailResponse, CoachNote } from "@/types/coach";
import type { HabitFormValues } from "@/lib/validation/habit";

function buildCoachHref(view: "summary" | "members" | "training", memberId?: string | null) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (memberId) {
    params.set("member", memberId);
  }
  return `/coach?${params.toString()}`;
}

function formatMonthParam(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
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
  const [detail, setDetail] = useState<CoachMemberDetailResponse | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
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

  const loadDetail = async (memberId: string | null, targetMonth = monthAnchor, showLoading = false) => {
    if (!session?.access_token || !memberId) {
      setDetail(null);
      return;
    }

    if (showLoading) {
      setDetailLoading(true);
    }

    try {
      const nextDetail = await fetchCoachMemberDetail(session.access_token, memberId, formatMonthParam(targetMonth));
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha del alumno.");
    } finally {
      if (showLoading) {
        setDetailLoading(false);
      }
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

  useEffect(() => {
    if (!selectedMemberId) {
      setDetail(null);
      return;
    }

    void loadDetail(selectedMemberId, monthAnchor, true);
  }, [selectedMemberId, session?.access_token]);

  useEffect(() => {
    if (!selectedMemberId || !session?.access_token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadDetail(selectedMemberId, monthAnchor, false);
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedMemberId, monthAnchor, session?.access_token]);

  const runMutation = async (callback: () => Promise<void>) => {
    setMutating(true);
    setError(null);
    try {
      await callback();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "No se pudo completar la acción del coach.");
    } finally {
      setMutating(false);
    }
  };

  const refreshSelectedDetail = async (targetMonth = monthAnchor) => {
    await loadDetail(selectedMemberId, targetMonth, false);
  };

  const handleCreateHabit = async (values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de crear un entrenamiento.");
    }

    await runMutation(async () => {
      await createCoachHabit(session.access_token, selectedMember.userId, values);
      await Promise.all([loadOverview(false), refreshSelectedDetail()]);
    });
  };

  const handleUpdateHabit = async (habitId: string, values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de editar un entrenamiento.");
    }

    await runMutation(async () => {
      await updateCoachHabit(session.access_token, selectedMember.userId, habitId, values);
      await Promise.all([loadOverview(false), refreshSelectedDetail()]);
    });
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error("Selecciona un alumno antes de eliminar un entrenamiento.");
    }

    await runMutation(async () => {
      await deleteCoachHabit(session.access_token, selectedMember.userId, habitId);
      await Promise.all([loadOverview(false), refreshSelectedDetail()]);
    });
  };

  const handleCreateNote = async (values: { title: string; body: string; noteType: CoachNote["noteType"]; pinned: boolean }) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await createCoachNote(session.access_token, selectedMemberId, values);
      await refreshSelectedDetail();
    });
  };

  const handleToggleNotePinned = async (noteId: string, pinned: boolean) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await updateCoachNote(session.access_token, selectedMemberId, { noteId, pinned });
      await refreshSelectedDetail();
    });
  };

  const handleArchiveNote = async (noteId: string) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await updateCoachNote(session.access_token, selectedMemberId, { noteId, archived: true });
      await refreshSelectedDetail();
    });
  };

  const handleCreateAlert = async (values: { title: string; body: string; severity: CoachAlert["severity"] }) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await createCoachAlert(session.access_token, selectedMemberId, values);
      await refreshSelectedDetail();
    });
  };

  const handleArchiveAlert = async (alertId: string) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await updateCoachAlert(session.access_token, selectedMemberId, { alertId, archived: true });
      await refreshSelectedDetail();
    });
  };

  const handleSendMessage = async (body: string) => {
    if (!session?.access_token || !selectedMemberId) {
      return;
    }

    await runMutation(async () => {
      await sendCoachMessage(session.access_token, selectedMemberId, body.trim());
      await refreshSelectedDetail();
    });
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
            Seguimiento real, comunicación y control diario de tus alumnos.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Revisa progreso en vivo, calendario, hábitos activos, notas privadas, alertas visibles en la cuenta del alumno y chat directo desde el panel.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void Promise.all([loadOverview(false), refreshSelectedDetail()])} disabled={refreshing || mutating}>
          {refreshing ? "Actualizando..." : "Actualizar panel"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-[24px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <SummaryMetric title="Asignados" value={String(overview?.summary.assignedMembers ?? 0)} helper="alumnos bajo tu seguimiento directo" tone="#67e8f9" />
        <SummaryMetric title="Completados hoy" value={String(overview?.summary.completedToday ?? 0)} helper="alumnos que cerraron su día" tone="#6ee7b7" />
        <SummaryMetric title="Cumplimiento medio" value={`${overview?.summary.averageCompliance ?? 0}%`} helper="últimos 7 días del grupo" tone="#fcd34d" />
        <SummaryMetric title="Racha media" value={String(overview?.summary.averageStreak ?? 0)} helper="consistencia de tus asignados" tone="#fda4af" />
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
        Cuando el admin del gym te asigne miembros, aparecerán aquí con su progreso real y podrás gestionar entrenamientos y seguimiento.
      </CardDescription>
    </Card>
  );

  const summaryView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Alumnos asignados</h2>
            <p className="text-sm text-muted-foreground">Selecciona un alumno para abrir su ficha completa o editar su plan.</p>
          </div>
          {membersList}
        </section>

        <section className="space-y-5">
          <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
            <CardTitle className="text-white">Acceso rápido</CardTitle>
            <CardDescription className="mt-1 text-white/60">
              Entra a la ficha del alumno para revisar series en vivo, historial, alertas y chat. Usa entrenamientos para modificar hábitos reales.
            </CardDescription>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => updateView("members", selectedMember?.userId)}>
                Abrir ficha del alumno
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr),minmax(0,1.14fr)]">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Alumnos asignados</h2>
            <p className="text-sm text-muted-foreground">Elige un alumno para abrir su ficha completa y ver actividad real en tiempo casi real.</p>
          </div>
          {membersList}
        </section>

        <section>
          <CoachMemberDetailPanel
            detail={detail}
            loading={detailLoading}
            busy={mutating || refreshing}
            onPreviousMonth={() => {
              const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1, 12, 0, 0, 0);
              setMonthAnchor(next);
              void loadDetail(selectedMemberId, next, true);
            }}
            onNextMonth={() => {
              const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1, 12, 0, 0, 0);
              setMonthAnchor(next);
              void loadDetail(selectedMemberId, next, true);
            }}
            onOpenTraining={() => updateView("training", selectedMember?.userId)}
            onCreateNote={handleCreateNote}
            onToggleNotePinned={handleToggleNotePinned}
            onArchiveNote={handleArchiveNote}
            onCreateAlert={handleCreateAlert}
            onArchiveAlert={handleArchiveAlert}
            onSendMessage={handleSendMessage}
          />
        </section>
      </div>
    </div>
  );

  const trainingView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr),minmax(0,1.14fr)]">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Selecciona un alumno</h2>
            <p className="text-sm text-muted-foreground">El editor escribe directamente en los hábitos reales del alumno en Supabase.</p>
          </div>
          {membersList}
        </section>

        <section className="space-y-5">
          {detail ? (
            <Card className="rounded-[30px] border border-white/8 bg-[#111A24] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">{detail.member.name}</CardTitle>
                  <CardDescription className="text-white/60">
                    {detail.member.groupName} · {detail.liveToday.completedSets}/{detail.liveToday.totalSets} series hoy
                  </CardDescription>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {detail.member.weeklyCompliance}% semanal
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {detail.liveToday.habits.length ? detail.liveToday.habits.slice(0, 4).map((habit) => (
                  <div key={habit.habitId} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{habit.name}</p>
                        <p className="text-sm text-white/55">{formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)}</p>
                      </div>
                      <div className="text-right text-sm text-white/65">
                        <p>{habit.completedSets}/{habit.targetSets}</p>
                        <p>{habit.isCompleted ? "Cerrado" : `${habit.remainingSets} pendientes`}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm text-white/55">
                    No hay entrenamiento programado para hoy.
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          {selectedMember ? (
            <CoachHabitEditor
              member={selectedMember}
              busy={mutating || refreshing || detailLoading}
              onCreate={handleCreateHabit}
              onUpdate={handleUpdateHabit}
              onDelete={handleDeleteHabit}
            />
          ) : (
            <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
              <CardTitle className="text-white">Sin alumno seleccionado</CardTitle>
              <CardDescription className="text-white/60">
                Selecciona un alumno de la izquierda para gestionar su entrenamiento.
              </CardDescription>
            </Card>
          )}
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

