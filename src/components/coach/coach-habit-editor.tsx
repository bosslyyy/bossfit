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
import { HABIT_CATEGORIES, HABIT_COLORS, HABIT_ICONS, HABIT_LEVELS } from "@/lib/constants";
import { cn, formatHabitTarget, formatSelectedDays, titleCase } from "@/lib/utils";
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
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <CardTitle className="text-white">Selecciona un alumno</CardTitle>
        <CardDescription className="text-white/62">
          Aquí podrás crear, editar, pausar o eliminar los entrenamientos reales que verá dentro de BossFit.
        </CardDescription>
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
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el entrenamiento.");
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
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo cambiar el estado.");
    }
  };

  const handleDelete = async (habitId: string) => {
    const confirmed = window.confirm("¿Eliminar este entrenamiento del alumno?");
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
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el entrenamiento.");
    }
  };

  return (
    <div id="entrenamientos" className="space-y-5">
      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Plan del alumno</p>
            <CardTitle className="mt-2 text-white">{member.name}</CardTitle>
            <CardDescription className="mt-1 text-white/62">
              {member.groupName} · {member.planName} · Última actividad {member.lastActivityLabel}
            </CardDescription>
          </div>
          <div className="grid min-w-[14rem] grid-cols-2 gap-3 text-sm">
            <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
              <p className="text-white/48">Nivel</p>
              <p className="mt-2 font-semibold text-white">{member.level}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
              <p className="text-white/48">Boss Points</p>
              <p className="mt-2 font-semibold text-white">{member.totalPoints}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white">Entrenamientos activos y programados</CardTitle>
            <CardDescription className="mt-1 text-white/60">
              Gestiona lo que el alumno verá en su app. Los cambios se guardan en su cuenta y se reflejan al entrar.
            </CardDescription>
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
            Nuevo entrenamiento
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
                      {habit.active ? "Activo" : "Pausado"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/62">
                    {formatHabitTarget(habit.targetSets, habit.repsPerSet, habit.trackingMode, habit.secondsPerSet)} · {formatSelectedDays(habit.selectedDays)}
                    {habit.level ? ` · ${titleCase(habit.level)}` : ""}
                    {habit.category ? ` · ${titleCase(habit.category)}` : ""}
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
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/8 text-white ring-white/10 hover:bg-white/12"
                    onClick={() => void handleToggleActive(habit)}
                    disabled={busy}
                  >
                    {habit.active ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {habit.active ? "Pausar" : "Activar"}
                  </Button>
                  <Button variant="danger" onClick={() => void handleDelete(habit.id)} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm text-white/62">
              Este alumno aún no tiene entrenamientos cargados. Puedes crear el primero desde el formulario de abajo.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[32px] border border-white/8 bg-[#111A24] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
        <div className="space-y-1">
          <CardTitle className="text-white">{editingHabit ? "Editar entrenamiento" : "Crear entrenamiento"}</CardTitle>
          <CardDescription className="text-white/60">
            Configura nombre, bloques y días. El alumno registrará series completas por reps o por tiempo desde su app.
          </CardDescription>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <Label htmlFor="coach-habit-name" className="text-white">Nombre</Label>
            <Input
              id="coach-habit-name"
              placeholder="Ej. Cuerda o lagartijas inclinadas"
              className="bg-white/6 text-white placeholder:text-white/35"
              {...form.register("name")}
            />
            {form.formState.errors.name ? <p className="mt-2 text-sm text-rose-300">{form.formState.errors.name.message}</p> : null}
          </div>

          <div>
            <Label className="text-white">Modo de registro</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[
                { value: "reps", label: "Repeticiones", helper: "Series tradicionales" },
                { value: "timer", label: "Tiempo", helper: "Series con contador" }
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
              <Label htmlFor="coach-target-sets" className="text-white">Series</Label>
              <Input id="coach-target-sets" type="number" min={1} max={999} className="bg-white/6 text-white" {...form.register("targetSets")} />
              {form.formState.errors.targetSets ? (
                <p className="mt-2 text-sm text-rose-300">{form.formState.errors.targetSets.message}</p>
              ) : null}
            </div>
            <div>
              {trackingMode === "timer" ? (
                <>
                  <Label htmlFor="coach-seconds" className="text-white">Tiempo por serie (segundos)</Label>
                  <Input id="coach-seconds" type="number" min={5} max={7200} className="bg-white/6 text-white" {...form.register("secondsPerSet")} />
                  {form.formState.errors.secondsPerSet ? (
                    <p className="mt-2 text-sm text-rose-300">{form.formState.errors.secondsPerSet.message}</p>
                  ) : (
                    <p className="mt-2 text-xs text-white/45">Ej. 60 = 1 minuto por serie.</p>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="coach-reps" className="text-white">Reps por serie</Label>
                  <Input id="coach-reps" type="number" min={1} max={2500} className="bg-white/6 text-white" {...form.register("repsPerSet")} />
                  {form.formState.errors.repsPerSet ? (
                    <p className="mt-2 text-sm text-rose-300">{form.formState.errors.repsPerSet.message}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div>
            <Label className="text-white">Días</Label>
            <DaySelector
              value={values.selectedDays}
              onChange={(days) => form.setValue("selectedDays", days, { shouldDirty: true, shouldValidate: true })}
              error={form.formState.errors.selectedDays?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="coach-category" className="text-white">Categoría</Label>
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
                <option value="">Sin categoría</option>
                {HABIT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-icon" className="text-white">Ícono</Label>
              <select
                id="coach-icon"
                value={values.icon}
                onChange={(event) => form.setValue("icon", event.target.value as HabitFormValues["icon"], { shouldDirty: true })}
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                {HABIT_ICONS.map((iconOption) => (
                  <option key={iconOption.value} value={iconOption.value}>
                    {iconOption.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-color" className="text-white">Color</Label>
              <select
                id="coach-color"
                value={values.color}
                onChange={(event) => form.setValue("color", event.target.value as HabitFormValues["color"], { shouldDirty: true })}
                className={cn(selectClassName, "bg-white/6 text-white")}
              >
                {HABIT_COLORS.map((colorOption) => (
                  <option key={colorOption.value} value={colorOption.value}>
                    {colorOption.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="coach-level" className="text-white">Nivel</Label>
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
                <option value="">Sin nivel</option>
                {HABIT_LEVELS.map((levelOption) => (
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
            Hábito activo para el alumno
          </label>

          {error ? <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {editingHabit ? "Guardar cambios" : "Crear entrenamiento"}
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
                Cancelar edición
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
