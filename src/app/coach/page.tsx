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
import { useAppLocale } from "@/hooks/use-app-locale";
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
  const locale = useAppLocale();
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

  const copy =
    locale === "en"
      ? {
          loadPanelError: "Could not load the coach panel.",
          loadMemberError: "Could not load the member profile.",
          mutateError: "Could not complete the coach action.",
          selectCreate: "Select a member before creating training.",
          selectEdit: "Select a member before editing training.",
          selectDelete: "Select a member before deleting training.",
          loading: "Preparing coach panel...",
          eyebrow: "Coach HQ",
          heroTitle: "Live tracking, communication, and daily control of your members.",
          heroDescription:
            "Review live progress, calendar, active habits, private notes, alerts visible in the member account, and direct chat from the panel.",
          refreshing: "Refreshing...",
          refresh: "Refresh panel",
          assigned: "Assigned",
          assignedHelper: "members under your direct follow-up",
          completedToday: "Completed today",
          completedTodayHelper: "members who closed their day",
          avgCompliance: "Average compliance",
          avgComplianceHelper: "last 7 days of the group",
          avgStreak: "Average streak",
          avgStreakHelper: "consistency of your assigned members",
          noMembersTitle: "You do not have assigned members yet",
          noMembersDescription:
            "When the gym admin assigns members to you, they will appear here with real progress and you will be able to manage training and follow-up.",
          assignedMembers: "Assigned members",
          assignedMembersDescription: "Select a member to open the full profile or edit the plan.",
          quickAccess: "Quick access",
          quickAccessDescription:
            "Open the member profile to review live sets, history, alerts, and chat. Use training to modify real habits.",
          openProfile: "Open member profile",
          manageTraining: "Manage training",
          membersDescription: "Choose a member to open the full profile and see real activity in near real time.",
          selectMember: "Select a member",
          trainingDescription: "The editor writes directly to the member's real habits in Supabase.",
          todayTrainingDescription: (groupName: string, completedSets: number, totalSets: number) =>
            `${groupName} Â· ${completedSets}/${totalSets} sets today`,
          weeklyLabel: "weekly",
          closed: "Closed",
          pending: "pending",
          noTrainingToday: "No training scheduled for today.",
          noMemberSelected: "No selected member",
          noMemberSelectedDescription: "Select a member on the left to manage their training."
        }
      : {
          loadPanelError: "No se pudo cargar el panel del coach.",
          loadMemberError: "No se pudo cargar la ficha del alumno.",
          mutateError: "No se pudo completar la acciï¿½n del coach.",
          selectCreate: "Selecciona un alumno antes de crear un entrenamiento.",
          selectEdit: "Selecciona un alumno antes de editar un entrenamiento.",
          selectDelete: "Selecciona un alumno antes de eliminar un entrenamiento.",
          loading: "Preparando panel del entrenador...",
          eyebrow: "Coach HQ",
          heroTitle: "Seguimiento real, comunicaciÃ³n y control diario de tus alumnos.",
          heroDescription:
            "Revisa progreso en vivo, calendario, ejercicios activos, notas privadas, alertas visibles en la cuenta del alumno y chat directo desde el panel.",
          refreshing: "Actualizando...",
          refresh: "Actualizar panel",
          assigned: "Asignados",
          assignedHelper: "alumnos bajo tu seguimiento directo",
          completedToday: "Completados hoy",
          completedTodayHelper: "alumnos que cerraron su dÃ­a",
          avgCompliance: "Cumplimiento medio",
          avgComplianceHelper: "Ãšltimos 7 dÃ­as del grupo",
          avgStreak: "Racha media",
          avgStreakHelper: "consistencia de tus asignados",
          noMembersTitle: "No tienes alumnos asignados todavÃ­a",
          noMembersDescription:
            "Cuando el admin del gym te asigne miembros, aparecerï¿½n aquÃ­ con su progreso real y podrÃ¡s gestionar entrenamientos y seguimiento.",
          assignedMembers: "Alumnos asignados",
          assignedMembersDescription: "Selecciona un alumno para abrir su ficha completa o editar su plan.",
          quickAccess: "Acceso rÃ¡pido",
          quickAccessDescription:
            "Entra a la ficha del alumno para revisar series en vivo, historial, alertas y chat. Usa entrenamientos para modificar ejercicios reales.",
          openProfile: "Abrir ficha del alumno",
          manageTraining: "Gestionar entrenamientos",
          membersDescription: "Elige un alumno para abrir su ficha completa y ver actividad real en tiempo casi real.",
          selectMember: "Selecciona un alumno",
          trainingDescription: "El editor escribe directamente en los ejercicios reales del alumno en Supabase.",
          todayTrainingDescription: (groupName: string, completedSets: number, totalSets: number) =>
            `${groupName} Â· ${completedSets}/${totalSets} series hoy`,
          weeklyLabel: "semanal",
          closed: "Cerrado",
          pending: "pendientes",
          noTrainingToday: "No hay entrenamiento programado para hoy.",
          noMemberSelected: "Sin alumno seleccionado",
          noMemberSelectedDescription: "Selecciona un alumno de la izquierda para gestionar su entrenamiento."
        };

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
      setError(loadError instanceof Error ? loadError.message : copy.loadPanelError);
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
      setError(loadError instanceof Error ? loadError.message : copy.loadMemberError);
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
      setError(mutationError instanceof Error ? mutationError.message : copy.mutateError);
    } finally {
      setMutating(false);
    }
  };

  const refreshSelectedDetail = async (targetMonth = monthAnchor) => {
    await loadDetail(selectedMemberId, targetMonth, false);
  };

  const handleCreateHabit = async (values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error(copy.selectCreate);
    }

    await runMutation(async () => {
      await createCoachHabit(session.access_token, selectedMember.userId, values);
      await Promise.all([loadOverview(false), refreshSelectedDetail()]);
    });
  };

  const handleUpdateHabit = async (habitId: string, values: HabitFormValues) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error(copy.selectEdit);
    }

    await runMutation(async () => {
      await updateCoachHabit(session.access_token, selectedMember.userId, habitId, values);
      await Promise.all([loadOverview(false), refreshSelectedDetail()]);
    });
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!session?.access_token || !selectedMember) {
      throw new Error(copy.selectDelete);
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
    return <LoadingScreen title={copy.loading} />;
  }

  const hero = (
    <section className="space-y-4 rounded-[34px] border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">{copy.eyebrow}</p>
          <h1 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold text-card-foreground">{copy.heroTitle}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{copy.heroDescription}</p>
        </div>
        <Button variant="secondary" onClick={() => void Promise.all([loadOverview(false), refreshSelectedDetail()])} disabled={refreshing || mutating}>
          {refreshing ? copy.refreshing : copy.refresh}
        </Button>
      </div>

      {error ? <div className="rounded-[24px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <SummaryMetric title={copy.assigned} value={String(overview?.summary.assignedMembers ?? 0)} helper={copy.assignedHelper} tone="#67e8f9" />
        <SummaryMetric title={copy.completedToday} value={String(overview?.summary.completedToday ?? 0)} helper={copy.completedTodayHelper} tone="#6ee7b7" />
        <SummaryMetric title={copy.avgCompliance} value={`${overview?.summary.averageCompliance ?? 0}%`} helper={copy.avgComplianceHelper} tone="#fcd34d" />
        <SummaryMetric title={copy.avgStreak} value={String(overview?.summary.averageStreak ?? 0)} helper={copy.avgStreakHelper} tone="#fda4af" />
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
      <CardTitle>{copy.noMembersTitle}</CardTitle>
      <CardDescription className="mt-2">{copy.noMembersDescription}</CardDescription>
    </Card>
  );

  const summaryView = (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{copy.assignedMembers}</h2>
            <p className="text-sm text-muted-foreground">{copy.assignedMembersDescription}</p>
          </div>
          {membersList}
        </section>

        <section className="space-y-5">
          <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
            <CardTitle className="text-white">{copy.quickAccess}</CardTitle>
            <CardDescription className="mt-1 text-white/60">{copy.quickAccessDescription}</CardDescription>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => updateView("members", selectedMember?.userId)}>
                {copy.openProfile}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="secondary" className="bg-white/8 text-white ring-white/10 hover:bg-white/12" onClick={() => updateView("training", selectedMember?.userId)}>
                {copy.manageTraining}
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
            <h2 className="font-display text-2xl font-semibold text-foreground">{copy.assignedMembers}</h2>
            <p className="text-sm text-muted-foreground">{copy.membersDescription}</p>
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
            <h2 className="font-display text-2xl font-semibold text-foreground">{copy.selectMember}</h2>
            <p className="text-sm text-muted-foreground">{copy.trainingDescription}</p>
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
                    {copy.todayTrainingDescription(detail.member.groupName, detail.liveToday.completedSets, detail.liveToday.totalSets)}
                  </CardDescription>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {detail.member.weeklyCompliance}% {copy.weeklyLabel}
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
                        <p>{habit.isCompleted ? copy.closed : `${habit.remainingSets} ${copy.pending}`}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm text-white/55">
                    {copy.noTrainingToday}
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
              <CardTitle className="text-white">{copy.noMemberSelected}</CardTitle>
              <CardDescription className="text-white/60">{copy.noMemberSelectedDescription}</CardDescription>
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

