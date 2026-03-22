"use client";

import { useMemo, useState } from "react";

import {
  BellRing,
  ClipboardList,
  MessageSquareText,
  Pin,
  Send,
  UserRound
} from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { ActivityChartCard } from "@/components/progress/activity-chart-card";
import { HabitHistoryCard } from "@/components/progress/habit-history-card";
import { MonthlyCalendar } from "@/components/progress/monthly-calendar";
import { Button } from "@/components/ui/button";
import { useAppLocale } from "@/hooks/use-app-locale";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatHabitTarget } from "@/lib/utils";
import type { CoachAlert, CoachMemberDetailResponse, CoachNote } from "@/types/coach";

function formatDateTime(value: string | undefined, locale: "es" | "en", emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function severityTone(severity: CoachAlert["severity"]) {
  switch (severity) {
    case "urgent":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "warning":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "success":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
  }
}

export function CoachMemberDetailPanel({
  detail,
  loading,
  busy,
  onPreviousMonth,
  onNextMonth,
  onOpenTraining,
  onCreateNote,
  onToggleNotePinned,
  onArchiveNote,
  onCreateAlert,
  onArchiveAlert,
  onSendMessage
}: {
  detail: CoachMemberDetailResponse | null;
  loading: boolean;
  busy: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onOpenTraining: () => void;
  onCreateNote: (values: { title: string; body: string; noteType: CoachNote["noteType"]; pinned: boolean }) => Promise<void>;
  onToggleNotePinned: (noteId: string, pinned: boolean) => Promise<void>;
  onArchiveNote: (noteId: string) => Promise<void>;
  onCreateAlert: (values: { title: string; body: string; severity: CoachAlert["severity"] }) => Promise<void>;
  onArchiveAlert: (alertId: string) => Promise<void>;
  onSendMessage: (body: string) => Promise<void>;
}) {
  const locale = useAppLocale();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<CoachNote["noteType"]>("general");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<CoachAlert["severity"]>("info");
  const [messageBody, setMessageBody] = useState("");

  const copy =
    locale === "en"
      ? {
          noDate: "No date",
          loading: "Loading member profile...",
          selectTitle: "Select a member",
          selectDescription: "Choose a member from the list to open the full profile, review live progress, and communicate with them.",
          memberProfile: "Member profile",
          noUsername: "no-username",
          joined: "Joined",
          lastActivity: "Last activity",
          editTraining: "Edit training",
          weeklyCompliance: "Weekly compliance",
          currentStreak: "Current streak",
          points: "Boss Points",
          level: "Level",
          todayTraining: "Today's training",
          todayTrainingDescription: (dateKey: string) => `Live sets for ${dateKey}. This refreshes from Supabase.`,
          sets: "Sets",
          todayBlock: "Today's block",
          closed: "Closed",
          pending: "pending",
          noHabitsToday: "No habits are scheduled today for this member.",
          historyTitle: "History by habit",
          historyDescription: "Last 7 days by active habit to review real adherence.",
          notesTitle: "Coach notes",
          notesDescription: "Private notes about technique, follow-up, and member context.",
          noteTitlePlaceholder: "Note title",
          noteBodyPlaceholder: "Write the member note...",
          noteTypes: {
            general: "General",
            performance: "Performance",
            injury: "Injury",
            nutrition: "Nutrition",
            mindset: "Mindset",
            followup: "Follow-up"
          },
          saveNote: "Save note",
          unpin: "Unpin",
          pin: "Pin",
          archive: "Archive",
          updated: "Updated",
          noNotes: "There are no notes for this member yet.",
          alertsTitle: "Alerts for the member",
          alertsDescription: "Actionable messages that appear in the member's real account.",
          alertTitlePlaceholder: "Alert title",
          alertBodyPlaceholder: "Describe the alert the member will see...",
          severities: {
            info: "Info",
            warning: "Warning",
            success: "Success",
            urgent: "Urgent"
          },
          sendAlert: "Send alert",
          read: "Read",
          pendingAlert: "Pending",
          dismissed: "Dismissed",
          active: "Active",
          noAlerts: "There are no active alerts for this member.",
          chatTitle: "Coach - member chat",
          chatDescription: "Direct channel for daily follow-up and feedback.",
          coach: "Coach",
          member: "Member",
          noMessages: "There are no messages in this chat yet.",
          messagePlaceholder: "Write an instruction or feedback for the member...",
          sendMessage: "Send message"
        }
      : {
          noDate: "Sin fecha",
          loading: "Cargando ficha del alumno...",
          selectTitle: "Selecciona un alumno",
          selectDescription: "Elige un alumno de la lista para abrir su ficha completa, revisar progreso real y comunicarte con él.",
          memberProfile: "Ficha del alumno",
          noUsername: "sin-username",
          joined: "Alta",
          lastActivity: "Última actividad",
          editTraining: "Editar entrenamientos",
          weeklyCompliance: "Cumplimiento semanal",
          currentStreak: "Racha actual",
          points: "Boss Points",
          level: "Nivel",
          todayTraining: "Entrenamiento de hoy",
          todayTrainingDescription: (dateKey: string) => `Series en vivo para ${dateKey}. Esto se refresca desde Supabase.`,
          sets: "Series",
          todayBlock: "Bloque de hoy",
          closed: "Cerrado",
          pending: "pendientes",
          noHabitsToday: "No hay hábitos programados hoy para este alumno.",
          historyTitle: "Historial por h�bito",
          historyDescription: "Últimos 7 días por h�bito activo para revisar adherencia real.",
          notesTitle: "Notas del coach",
          notesDescription: "Notas privadas sobre técnica, seguimiento y contexto del alumno.",
          noteTitlePlaceholder: "Título de la nota",
          noteBodyPlaceholder: "Escribe la nota del alumno...",
          noteTypes: {
            general: "General",
            performance: "Performance",
            injury: "Lesión",
            nutrition: "Nutrición",
            mindset: "Mentalidad",
            followup: "Seguimiento"
          },
          saveNote: "Guardar nota",
          unpin: "Desfijar",
          pin: "Fijar",
          archive: "Archivar",
          updated: "Actualizada",
          noNotes: "Aún no hay notas para este alumno.",
          alertsTitle: "Alertas para el alumno",
          alertsDescription: "Mensajes accionables que aparecen en la cuenta real del alumno.",
          alertTitlePlaceholder: "Título de la alerta",
          alertBodyPlaceholder: "Describe la alerta que verá el alumno...",
          severities: {
            info: "Info",
            warning: "Warning",
            success: "Success",
            urgent: "Urgente"
          },
          sendAlert: "Enviar alerta",
          read: "Leída",
          pendingAlert: "Pendiente",
          dismissed: "Descartada",
          active: "Activa",
          noAlerts: "No hay alertas activas para este alumno.",
          chatTitle: "Chat coach - alumno",
          chatDescription: "Canal directo para seguimiento diario y feedback.",
          coach: "Coach",
          member: "Alumno",
          noMessages: "Todavía no hay mensajes en este chat.",
          messagePlaceholder: "Escribe una instrucción o feedback para el alumno...",
          sendMessage: "Enviar mensaje"
        };

  const liveCompliance = useMemo(() => {
    if (!detail?.liveToday.totalSets) {
      return 0;
    }

    return Math.round((detail.liveToday.completedSets / detail.liveToday.totalSets) * 100);
  }, [detail]);

  if (loading) {
    return <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white">{copy.loading}</Card>;
  }

  if (!detail) {
    return (
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white">
        <CardTitle className="text-white">{copy.selectTitle}</CardTitle>
        <CardDescription className="text-white/60">{copy.selectDescription}</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <UserRound className="h-3.5 w-3.5" /> {copy.memberProfile}
            </div>
            <h2 className="font-display text-3xl font-semibold text-white">{detail.member.name}</h2>
            <div className="space-y-1 text-sm text-white/60">
              <p>{detail.member.email}</p>
              <p>
                @{detail.member.username ?? copy.noUsername} · {detail.member.groupName} · {detail.member.planName}
              </p>
              <p>
                {copy.joined}: {formatDateTime(detail.member.joinedAt, locale, copy.noDate)} · {copy.lastActivity}: {detail.member.lastActivityLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onOpenTraining}>{copy.editTraining}</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">{copy.weeklyCompliance}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.weeklyCompliance}%</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">{copy.currentStreak}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.currentStreak}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">{copy.points}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.totalPoints}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">{copy.level}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.level}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{copy.todayTraining}</CardTitle>
                <CardDescription>{copy.todayTrainingDescription(detail.liveToday.dateKey)}</CardDescription>
              </div>
              <div className="rounded-[22px] border border-border bg-surface px-4 py-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.sets}</p>
                <p className="font-display text-2xl font-semibold text-card-foreground">
                  {detail.liveToday.completedSets}/{detail.liveToday.totalSets}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{copy.todayBlock}</span>
                <span>{liveCompliance}%</span>
              </div>
              <ProgressBar value={liveCompliance} />
            </div>

            <div className="mt-4 space-y-3">
              {detail.liveToday.habits.length ? detail.liveToday.habits.map((habit) => (
                <div key={habit.habitId} className="rounded-[24px] border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                      <HabitIcon icon={habit.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-lg font-semibold text-card-foreground">{habit.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-card-foreground">{habit.completedSets}/{habit.targetSets}</p>
                          <p className="text-muted-foreground">{habit.isCompleted ? copy.closed : `${habit.remainingSets} ${copy.pending}`}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={habit.targetSets ? (habit.completedSets / habit.targetSets) * 100 : 0} />
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                  {copy.noHabitsToday}
                </div>
              )}
            </div>
          </Card>

          <ActivityChartCard data={detail.chartData} locale={locale} />
          <MonthlyCalendar monthLabel={detail.monthLabel} days={detail.calendarDays} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} locale={locale} />

          <section className="space-y-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">{copy.historyTitle}</h3>
              <p className="text-sm text-muted-foreground">{copy.historyDescription}</p>
            </div>
            <div className="space-y-3">
              {detail.habitHistory.map((entry) => (
                <HabitHistoryCard key={entry.habit.id} habit={entry.habit} history={entry.history} locale={locale} />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{copy.notesTitle}</CardTitle>
                  <CardDescription>{copy.notesDescription}</CardDescription>
                </div>
              </div>

              <div className="grid gap-3">
                <Input placeholder={copy.noteTitlePlaceholder} value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
                <select className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground" value={noteType} onChange={(event) => setNoteType(event.target.value as CoachNote["noteType"])}>
                  <option value="general">{copy.noteTypes.general}</option>
                  <option value="performance">{copy.noteTypes.performance}</option>
                  <option value="injury">{copy.noteTypes.injury}</option>
                  <option value="nutrition">{copy.noteTypes.nutrition}</option>
                  <option value="mindset">{copy.noteTypes.mindset}</option>
                  <option value="followup">{copy.noteTypes.followup}</option>
                </select>
                <textarea className="min-h-[7rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder={copy.noteBodyPlaceholder} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
                <Button
                  disabled={busy || noteTitle.trim().length < 2 || noteBody.trim().length < 2}
                  onClick={async () => {
                    await onCreateNote({ title: noteTitle, body: noteBody, noteType, pinned: false });
                    setNoteTitle("");
                    setNoteBody("");
                    setNoteType("general");
                  }}
                >
                  {copy.saveNote}
                </Button>
              </div>

              <div className="space-y-3">
                {detail.notes.length ? detail.notes.map((note) => (
                  <div key={note.id} className="rounded-[22px] border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-card-foreground">{note.title}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.noteTypes[note.noteType]}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => void onToggleNotePinned(note.id, !note.pinned)} disabled={busy}>
                          <Pin className="mr-2 h-4 w-4" />
                          {note.pinned ? copy.unpin : copy.pin}
                        </Button>
                        <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => void onArchiveNote(note.id)} disabled={busy}>
                          {copy.archive}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{note.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{copy.updated} {formatDateTime(note.updatedAt, locale, copy.noDate)}</p>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                    {copy.noNotes}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{copy.alertsTitle}</CardTitle>
                  <CardDescription>{copy.alertsDescription}</CardDescription>
                </div>
              </div>

              <div className="grid gap-3">
                <Input placeholder={copy.alertTitlePlaceholder} value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} />
                <select className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground" value={alertSeverity} onChange={(event) => setAlertSeverity(event.target.value as CoachAlert["severity"])}>
                  <option value="info">{copy.severities.info}</option>
                  <option value="warning">{copy.severities.warning}</option>
                  <option value="success">{copy.severities.success}</option>
                  <option value="urgent">{copy.severities.urgent}</option>
                </select>
                <textarea className="min-h-[6rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder={copy.alertBodyPlaceholder} value={alertBody} onChange={(event) => setAlertBody(event.target.value)} />
                <Button
                  disabled={busy || alertTitle.trim().length < 2 || alertBody.trim().length < 2}
                  onClick={async () => {
                    await onCreateAlert({ title: alertTitle, body: alertBody, severity: alertSeverity });
                    setAlertTitle("");
                    setAlertBody("");
                    setAlertSeverity("info");
                  }}
                >
                  {copy.sendAlert}
                </Button>
              </div>

              <div className="space-y-3">
                {detail.alerts.length ? detail.alerts.filter((alert) => !alert.archivedAt).map((alert) => (
                  <div key={alert.id} className={`rounded-[22px] border p-4 ${severityTone(alert.severity)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-2 text-sm opacity-90">{alert.body}</p>
                      </div>
                      <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => void onArchiveAlert(alert.id)} disabled={busy}>
                        {copy.archive}
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-80">
                      <span>{formatDateTime(alert.createdAt, locale, copy.noDate)}</span>
                      <span>{alert.readAt ? copy.read : copy.pendingAlert}</span>
                      <span>{alert.dismissedAt ? copy.dismissed : copy.active}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                    {copy.noAlerts}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{copy.chatTitle}</CardTitle>
                  <CardDescription>{copy.chatDescription}</CardDescription>
                </div>
              </div>

              <div className="max-h-[22rem] space-y-3 overflow-y-auto rounded-[24px] border border-border bg-surface p-4">
                {detail.messages.length ? detail.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderRole === "coach" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm ${message.senderRole === "coach" ? "bg-accent text-accent-foreground" : "bg-background text-card-foreground ring-1 ring-border"}`}>
                      <p className="font-semibold text-xs uppercase tracking-[0.16em] opacity-75">
                        {message.senderRole === "coach" ? copy.coach : copy.member}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                      <p className="mt-2 text-[11px] opacity-70">{formatDateTime(message.createdAt, locale, copy.noDate)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">{copy.noMessages}</div>
                )}
              </div>

              <div className="grid gap-3">
                <textarea className="min-h-[6rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder={copy.messagePlaceholder} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
                <Button
                  disabled={busy || messageBody.trim().length < 1}
                  onClick={async () => {
                    await onSendMessage(messageBody);
                    setMessageBody("");
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {copy.sendMessage}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
