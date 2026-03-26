"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilLine, PauseCircle, PlayCircle, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { DaySelector } from "@/components/habits/day-selector";
import { HabitIcon } from "@/components/habits/habit-icon";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLocale } from "@/hooks/use-app-locale";
import { getCategoryLabel, getHabitCategories, getHabitColorLabel, getHabitIcons, getHabitLevels, getLevelLabel } from "@/lib/i18n";
import { cn, formatHabitTarget, formatSelectedDays } from "@/lib/utils";
import {
  habitSchema,
  normalizeHabitFormValues,
  type HabitFormValues
} from "@/lib/validation/habit";
import type { CoachMemberOverview } from "@/lib/supabase/coach";
import type { Habit } from "@/types/habit";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

function toFormValues(habit: Habit): HabitFormValues {
  return normalizeHabitFormValues({
    name: habit.name,
    category: habit.category,
    trackingMode: habit.trackingMode,
    targetSets: habit.targetSets,
    repsPerSet: habit.repsPerSet,
    secondsPerSet: habit.secondsPerSet,
    selectedDays: habit.selectedDays,
    color: habit.color,
    icon: habit.icon,
    level: habit.level,
    active: habit.active
  });
}

export function CoachHabitEditor({
  member,
  busy,
  onCreate,
  onUpdate,
  onDelete
}: {
  member: CoachMemberOverview | null;
  busy: boolean;
  onCreate: (values: HabitFormValues) => Promise<void>;
  onUpdate: (habitId: string, values: HabitFormValues) => Promise<void>;
  onDelete: (habitId: string) => Promise<void>;
}) {
  const locale = useAppLocale();
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          selectMemberTitle: "Select a member",
          selectMemberDescription: "Here you can create, edit, pause, or remove the real training the member will see inside BossFit.",
          saveError: "Could not save training.",
          toggleError: "Could not change status.",
          deleteConfirm: "Delete this training from the member?",
          deleteError: "Could not delete training.",
          memberPlan: "Member plan",
          lastActivity: "Last activity",
          level: "Level",
          points: "Boss Points",
          trainingTitle: "Active and scheduled training",
          trainingDescription: "Manage what the member will see in the app. Changes are saved to the account and reflected on sign in.",
          newTraining: "New training",
          active: "Active",
          paused: "Paused",
          edit: "Edit",
          pause: "Pause",
          activate: "Activate",
          delete: "Delete",
          noTraining: "This member does not have any training yet. You can create the first one from the form below.",
          editTraining: "Edit training",
          createTraining: "Create training",
          formDescription: "Configure name, blocks, and days. The member will log completed sets by reps or by time in the app.",
          name: "Name",
          namePlaceholder: "Ex. Rope or incline push-ups",
          trackingMode: "Tracking mode",
          reps: "Repetitions",
          repsHelper: "Traditional sets",
          timer: "Time",
          timerHelper: "Timer-based sets",
          sets: "Sets",
          timePerSet: "Time per set (seconds)",
          timeHelper: "Ex. 60 = 1 minute per set.",
          repsPerSet: "Reps per set",
          days: "Days",
          category: "Category",
          noCategory: "No category",
          icon: "Icon",
          color: "Color",
          levelLabel: "Level",
          noLevel: "No level",
          activeHabit: "Exercise active for the member",
          saveChanges: "Save changes",
          createAction: "Create training",
          cancelEdit: "Cancel edit"
        }
      : {
          selectMemberTitle: "Selecciona un alumno",
          selectMemberDescription: "Aquí podrás crear, editar, pausar o eliminar los entrenamientos reales que verá dentro de BossFit.",
          saveError: "No se pudo guardar el entrenamiento.",
          toggleError: "No se pudo cambiar el estado.",
          deleteConfirm: "¿Eliminar este entrenamiento del alumno?",
          deleteError: "No se pudo eliminar el entrenamiento.",
          memberPlan: "Plan del alumno",
          lastActivity: "Última actividad",
          level: "Nivel",
          points: "Boss Points",
          trainingTitle: "Entrenamientos activos y programados",
          trainingDescription: "Gestiona lo que el alumno verá en su app. Los cambios se guardan en su cuenta y se reflejan al entrar.",
          newTraining: "Nuevo entrenamiento",
          active: "Activo",
          paused: "Pausado",
          edit: "Editar",
          pause: "Pausar",
          activate: "Activar",
          delete: "Eliminar",
          noTraining: "Este alumno aún no tiene entrenamientos cargados. Puedes crear el primero desde el formulario de abajo.",
          editTraining: "Editar entrenamiento",
          createTraining: "Crear entrenamiento",
          formDescription: "Configura nombre, bloques y días. El alumno registrar� series completas por reps o por tiempo desde su app.",
          name: "Nombre",
          namePlaceholder: "Ej. Cuerda o lagartijas inclinadas",
          trackingMode: "Modo de registro",
          reps: "Repeticiones",
          repsHelper: "Series tradicionales",
          timer: "Tiempo",
          timerHelper: "Series con contador",
          sets: "Series",
          timePerSet: "Tiempo por serie (segundos)",
          timeHelper: "Ej. 60 = 1 minuto por serie.",
          repsPerSet: "Reps por serie",
          days: "D�as",
          category: "Categoría",
          noCategory: "Sin categoría",
          icon: "Ícono",
          color: "Color",
          levelLabel: "Nivel",
          noLevel: "Sin nivel",
          activeHabit: "H�bito activo para el alumno",
          saveChanges: "Guardar cambios",
          createAction: "Crear entrenamiento",
          cancelEdit: "Cancelar edici�n"
        };

  const categories = getHabitCategories(locale);
  const iconOptions = getHabitIcons(locale);
  const levelOptions = getHabitLevels(locale);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: normalizeHabitFormValues(),
    mode: "onChange"
  });

  useEffect(() => {
    setEditingHabitId(null);
    setError(null);
    form.reset(normalizeHabitFormValues());
  }, [form, member?.userId]);

  const values = form.watch();
  const trackingMode = form.watch("trackingMode");
  const active = Boolean(form.watch("active"));
  const editingHabit = useMemo(
    () => member?.habits.find((habit) => habit.id === editingHabitId) ?? null,
    [editingHabitId, member?.habits]
  );

  useEffect(() => {
    if (!editingHabit) {
      return;
    }

    form.reset(toFormValues(editingHabit));
  }, [editingHabit, form]);

  if (!member) {
    return (
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <CardTitle className="text-white">{copy.selectMemberTitle}</CardTitle>
        <CardDescription className="text-white/62">{copy.selectMemberDescription}</CardDescription>
      </Card>
    );
  }

  const handleSubmit = form.handleSubmit(async (rawValues) => {
    setError(null);

    try {
      const parsed = habitSchema.parse(rawValues);
      if (editingHabitId) {
        await onUpdate(editingHabitId, parsed);
      } else {
        await onCreate(parsed);
      }

      setEditingHabitId(null);
      form.reset(normalizeHabitFormValues());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.saveError);
    }
  });

  const handleStartEdit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setError(null);
    form.reset(toFormValues(habit));
  };

  const handleToggleActive = async (habit: Habit) => {
    setError(null);
    try {
      await onUpdate(habit.id, { ...toFormValues(habit), active: !habit.active });
      if (editingHabitId === habit.id) {
        form.setValue("active", !habit.active, { shouldDirty: true });
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : copy.toggleError);
    }
  };

  const handleDelete = async (habitId: string) => {
    const confirmed = window.confirm(copy.deleteConfirm);
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await onDelete(habitId);
      if (editingHabitId === habitId) {
        setEditingHabitId(null);
        form.reset(normalizeHabitFormValues());
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : copy.deleteError);
    }
  };

  return (
    <div id="entrenamientos" className="space-y-5">
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">{copy.memberPlan}</p>
            <CardTitle className="mt-2 text-white">{member.name}</CardTitle>
            <CardDescription className="mt-1 text-white/62">
              {member.groupName} · {member.planName} · {copy.lastActivity} {member.lastActivityLabel}
            </CardDescription>
          </div>
          <div className="grid min-w-[14rem] grid-cols-2 gap-3 text-sm">
            <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
              <p className="text-white/48">{copy.level}</p>
              <p className="mt-2 font-semibold text-white">{member.level}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
              <p className="text-white/48">{copy.points}</p>
              <p className="mt-2 font-semibold text-white">{member.totalPoints}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white">{copy.trainingTitle}</CardTitle>
            <CardDescription className="mt-1 text-white/60">{copy.trainingDescription}</CardDescription>
          </div>
          <Button
            variant="secondary"
            className="bg-white/8 text-white ring-white/10 hover:bg-white/12"
            onClick={() => {
              setEditingHabitId(null);
              setError(null);
              form.reset(normalizeHabitFormValues());
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {copy.newTraining}
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {member.habits.length ? (
            member.habits.map((habit) => (
              <div key={habit.id} className="flex flex-wrap items-center gap-4 rounded-[26px] border border-white/8 bg-white/5 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                  <HabitIcon icon={habit.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-lg font-semibold text-white">{habit.name}</p>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", habit.active ? "bg-emerald-400/18 text-emerald-200" : "bg-white/10 text-white/65")}>
                      {habit.active ? copy.active : copy.paused}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/62">
                    {formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)} · {formatSelectedDays(habit.selectedDays, locale)}
                    {habit.level ? ` · ${getLevelLabel(locale, habit.level)}` : ""}
                    {habit.category ? ` · ${getCategoryLabel(locale, habit.category)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="bg-white/8 text-white ring-white/10 hover:bg-white/12"
                    onClick={() => handleStartEdit(habit)}
                    disabled={busy}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    {copy.edit}
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/8 text-white ring-white/10 hover:bg-white/12"
                    onClick={() => void handleToggleActive(habit)}
                    disabled={busy}
                  >
                    {habit.active ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {habit.active ? copy.pause : copy.activate}
                  </Button>
                  <Button variant="danger" onClick={() => void handleDelete(habit.id)} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {copy.delete}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm text-white/62">
              {copy.noTraining}
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="space-y-1">
          <CardTitle className="text-white">{editingHabit ? copy.editTraining : copy.createTraining}</CardTitle>
          <CardDescription className="text-white/60">{copy.formDescription}</CardDescription>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <Label htmlFor="coach-habit-name" className="text-white">{copy.name}</Label>
            <Input
              id="coach-habit-name"
              placeholder={copy.namePlaceholder}
              className="bg-white/6 text-white placeholder:text-white/35"
              {...form.register("name")}
            />
            {form.formState.errors.name ? <p className="mt-2 text-sm text-rose-300">{form.formState.errors.name.message}</p> : null}
          </div>

          <div>
            <Label className="text-white">{copy.trackingMode}</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[
                { value: "reps", label: copy.reps, helper: copy.repsHelper },
                { value: "timer", label: copy.timer, helper: copy.timerHelper }
              ].map((option) => {
                const selected = trackingMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      form.setValue("trackingMode", option.value as HabitFormValues["trackingMode"], {
                        shouldDirty: true,
                        shouldValidate: true
                      })
                    }
                    className={cn(
                      "rounded-[24px] border px-4 py-3 text-left transition",
                      selected
                        ? "border-cyan-300 bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-white/55">{option.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="coach-target-sets" className="text-white">{copy.sets}</Label>
              <Input id="coach-target-sets" type="number" min={1} max={999} className="bg-white/6 text-white" {...form.register("targetSets")} />
              {form.formState.errors.targetSets ? (
                <p className="mt-2 text-sm text-rose-300">{form.formState.errors.targetSets.message}</p>
              ) : null}
            </div>
            <div>
              {trackingMode === "timer" ? (
                <>
                  <Label htmlFor="coach-seconds" className="text-white">{copy.timePerSet}</Label>
                  <Input id="coach-seconds" type="number" min={5} max={7200} className="bg-white/6 text-white" {...form.register("secondsPerSet")} />
                  {form.formState.errors.secondsPerSet ? (
                    <p className="mt-2 text-sm text-rose-300">{form.formState.errors.secondsPerSet.message}</p>
                  ) : (
                    <p className="mt-2 text-xs text-white/45">{copy.timeHelper}</p>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="coach-reps" className="text-white">{copy.repsPerSet}</Label>
                  <Input id="coach-reps" type="number" min={1} max={2500} className="bg-white/6 text-white" {...form.register("repsPerSet")} />
                  {form.formState.errors.repsPerSet ? (
                    <p className="mt-2 text-sm text-rose-300">{form.formState.errors.repsPerSet.message}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div>
            <Label className="text-white">{copy.days}</Label>
            <DaySelector
              value={values.selectedDays}
              onChange={(days) => form.setValue("selectedDays", days, { shouldDirty: true, shouldValidate: true })}
              error={form.formState.errors.selectedDays?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="coach-category" className="text-white">{copy.category}</Label>
              <select
                id="coach-category"
                value={values.category ?? ""}
                onChange={(event) =>
                  form.setValue("category", (event.target.value || undefined) as HabitFormValues["category"], {
                    shouldDirty: true,
                    shouldValidate: true
                  })
                }
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                <option value="">{copy.noCategory}</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-icon" className="text-white">{copy.icon}</Label>
              <select
                id="coach-icon"
                value={values.icon}
                onChange={(event) => form.setValue("icon", event.target.value as HabitFormValues["icon"], { shouldDirty: true })}
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                {iconOptions.map((iconOption) => (
                  <option key={iconOption.value} value={iconOption.value}>
                    {iconOption.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-color" className="text-white">{copy.color}</Label>
              <select
                id="coach-color"
                value={values.color}
                onChange={(event) => form.setValue("color", event.target.value as HabitFormValues["color"], { shouldDirty: true })}
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                {(["ember", "emerald", "ocean", "sun", "rose", "graphite"] as const).map((colorValue) => (
                  <option key={colorValue} value={colorValue}>
                    {getHabitColorLabel(locale, colorValue)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-level" className="text-white">{copy.levelLabel}</Label>
              <select
                id="coach-level"
                value={values.level ?? ""}
                onChange={(event) =>
                  form.setValue("level", (event.target.value || undefined) as HabitFormValues["level"], {
                    shouldDirty: true,
                    shouldValidate: true
                  })
                }
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                <option value="">{copy.noLevel}</option>
                {levelOptions.map((levelOption) => (
                  <option key={levelOption.value} value={levelOption.value}>
                    {levelOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-white/82">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => form.setValue("active", event.target.checked, { shouldDirty: true })}
              className="h-4 w-4 rounded border-white/20 bg-transparent"
            />
            {copy.activeHabit}
          </label>

          {error ? <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {editingHabit ? copy.saveChanges : copy.createAction}
            </Button>
            {editingHabit ? (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  setEditingHabitId(null);
                  setError(null);
                  form.reset(normalizeHabitFormValues());
                }}
                disabled={busy}
              >
                {copy.cancelEdit}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
