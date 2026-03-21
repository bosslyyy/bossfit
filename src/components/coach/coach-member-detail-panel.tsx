"use client";

import { useMemo, useState } from "react";

import {
  BellRing,
  CalendarDays,
  ClipboardList,
  MessageSquareText,
  Pin,
  Send,
  Sparkles,
  TriangleAlert,
  UserRound,
  Zap
} from "lucide-react";

import { HabitIcon } from "@/components/habits/habit-icon";
import { ActivityChartCard } from "@/components/progress/activity-chart-card";
import { HabitHistoryCard } from "@/components/progress/habit-history-card";
import { MonthlyCalendar } from "@/components/progress/monthly-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatHabitTarget } from "@/lib/utils";
import type { CoachAlert, CoachMemberDetailResponse, CoachNote } from "@/types/coach";

function formatDateTime(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", {
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
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<CoachNote["noteType"]>("general");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<CoachAlert["severity"]>("info");
  const [messageBody, setMessageBody] = useState("");

  const liveCompliance = useMemo(() => {
    if (!detail?.liveToday.totalSets) {
      return 0;
    }

    return Math.round((detail.liveToday.completedSets / detail.liveToday.totalSets) * 100);
  }, [detail]);

  if (loading) {
    return <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white">Cargando ficha del alumno...</Card>;
  }

  if (!detail) {
    return (
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white">
        <CardTitle className="text-white">Selecciona un alumno</CardTitle>
        <CardDescription className="text-white/60">
          Elige un alumno de la lista para abrir su ficha completa, revisar progreso real y comunicarte con él.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <UserRound className="h-3.5 w-3.5" /> Ficha del alumno
            </div>
            <h2 className="font-display text-3xl font-semibold text-white">{detail.member.name}</h2>
            <div className="space-y-1 text-sm text-white/60">
              <p>{detail.member.email}</p>
              <p>
                @{detail.member.username ?? "sin-username"} · {detail.member.groupName} · {detail.member.planName}
              </p>
              <p>
                Alta: {formatDateTime(detail.member.joinedAt)} · Última actividad: {detail.member.lastActivityLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onOpenTraining}>Editar entrenamientos</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">Cumplimiento semanal</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.weeklyCompliance}%</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">Racha actual</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.currentStreak}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">Boss Points</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.totalPoints}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
            <p className="text-sm text-white/48">Nivel</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{detail.member.level}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Entrenamiento de hoy</CardTitle>
                <CardDescription>
                  Series en vivo para {detail.liveToday.dateKey}. Esto se refresca desde Supabase.
                </CardDescription>
              </div>
              <div className="rounded-[22px] border border-border bg-surface px-4 py-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Series</p>
                <p className="font-display text-2xl font-semibold text-card-foreground">
                  {detail.liveToday.completedSets}/{detail.liveToday.totalSets}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Bloque de hoy</span>
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
                          <p className="text-muted-foreground">{habit.isCompleted ? "Cerrado" : `${habit.remainingSets} pendientes`}</p>
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
                  No hay hábitos programados hoy para este alumno.
                </div>
              )}
            </div>
          </Card>

          <ActivityChartCard data={detail.chartData} />
          <MonthlyCalendar monthLabel={detail.monthLabel} days={detail.calendarDays} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />

          <section className="space-y-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">Historial por hábito</h3>
              <p className="text-sm text-muted-foreground">Últimos 7 días por hábito activo para revisar adherencia real.</p>
            </div>
            <div className="space-y-3">
              {detail.habitHistory.map((entry) => (
                <HabitHistoryCard key={entry.habit.id} habit={entry.habit} history={entry.history} />
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
                  <CardTitle>Notas del coach</CardTitle>
                  <CardDescription>Notas privadas sobre técnica, seguimiento y contexto del alumno.</CardDescription>
                </div>
              </div>

              <div className="grid gap-3">
                <Input placeholder="Título de la nota" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
                <select className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground" value={noteType} onChange={(event) => setNoteType(event.target.value as CoachNote["noteType"])}>
                  <option value="general">General</option>
                  <option value="performance">Performance</option>
                  <option value="injury">Lesión</option>
                  <option value="nutrition">Nutrición</option>
                  <option value="mindset">Mentalidad</option>
                  <option value="followup">Seguimiento</option>
                </select>
                <textarea className="min-h-[7rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder="Escribe la nota del alumno..." value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
                <Button
                  disabled={busy || noteTitle.trim().length < 2 || noteBody.trim().length < 2}
                  onClick={async () => {
                    await onCreateNote({ title: noteTitle, body: noteBody, noteType, pinned: false });
                    setNoteTitle("");
                    setNoteBody("");
                    setNoteType("general");
                  }}
                >
                  Guardar nota
                </Button>
              </div>

              <div className="space-y-3">
                {detail.notes.length ? detail.notes.map((note) => (
                  <div key={note.id} className="rounded-[22px] border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-card-foreground">{note.title}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{note.noteType}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => void onToggleNotePinned(note.id, !note.pinned)} disabled={busy}>
                          <Pin className="mr-2 h-4 w-4" />
                          {note.pinned ? "Desfijar" : "Fijar"}
                        </Button>
                        <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => void onArchiveNote(note.id)} disabled={busy}>
                          Archivar
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{note.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Actualizada {formatDateTime(note.updatedAt)}</p>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                    Aún no hay notas para este alumno.
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
                  <CardTitle>Alertas para el alumno</CardTitle>
                  <CardDescription>Mensajes accionables que aparecen en la cuenta real del alumno.</CardDescription>
                </div>
              </div>

              <div className="grid gap-3">
                <Input placeholder="Título de la alerta" value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} />
                <select className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground" value={alertSeverity} onChange={(event) => setAlertSeverity(event.target.value as CoachAlert["severity"])}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="urgent">Urgente</option>
                </select>
                <textarea className="min-h-[6rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder="Describe la alerta que verá el alumno..." value={alertBody} onChange={(event) => setAlertBody(event.target.value)} />
                <Button
                  disabled={busy || alertTitle.trim().length < 2 || alertBody.trim().length < 2}
                  onClick={async () => {
                    await onCreateAlert({ title: alertTitle, body: alertBody, severity: alertSeverity });
                    setAlertTitle("");
                    setAlertBody("");
                    setAlertSeverity("info");
                  }}
                >
                  Enviar alerta
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
                        Archivar
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-80">
                      <span>{formatDateTime(alert.createdAt)}</span>
                      <span>{alert.readAt ? "Leída" : "Pendiente"}</span>
                      <span>{alert.dismissedAt ? "Descartada" : "Activa"}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                    No hay alertas activas para este alumno.
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
                  <CardTitle>Chat coach - alumno</CardTitle>
                  <CardDescription>Canal directo para seguimiento diario y feedback.</CardDescription>
                </div>
              </div>

              <div className="max-h-[22rem] space-y-3 overflow-y-auto rounded-[24px] border border-border bg-surface p-4">
                {detail.messages.length ? detail.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderRole === "coach" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm ${message.senderRole === "coach" ? "bg-accent text-accent-foreground" : "bg-background text-card-foreground ring-1 ring-border"}`}>
                      <p className="font-semibold text-xs uppercase tracking-[0.16em] opacity-75">
                        {message.senderRole === "coach" ? "Coach" : "Alumno"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                      <p className="mt-2 text-[11px] opacity-70">{formatDateTime(message.createdAt)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">Todavía no hay mensajes en este chat.</div>
                )}
              </div>

              <div className="grid gap-3">
                <textarea className="min-h-[6rem] rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-card-foreground outline-none" placeholder="Escribe una instrucción o feedback para el alumno..." value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
                <Button
                  disabled={busy || messageBody.trim().length < 1}
                  onClick={async () => {
                    await onSendMessage(messageBody);
                    setMessageBody("");
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar mensaje
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

