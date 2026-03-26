"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { DaySelector } from "@/components/habits/day-selector";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitPreview } from "@/components/habits/habit-preview";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLocale } from "@/hooks/use-app-locale";
import { HABIT_COLORS, HABIT_COLOR_STYLES } from "@/lib/constants";
import { getHabitCategories, getHabitIcons, getHabitLevels } from "@/lib/i18n";
import {
  createHabitAction,
  deleteHabitAction,
  updateHabitAction
} from "@/lib/supabase/user-state-actions";
import { cn } from "@/lib/utils";
import {
  habitSchema,
  normalizeHabitFormValues,
  type HabitFormValues
} from "@/lib/validation/habit";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

export function HabitForm({
  mode,
  habitId,
  initialValues
}: {
  mode: "create" | "edit";
  habitId?: string;
  initialValues?: HabitFormValues;
}) {
  const router = useRouter();
  const locale = useAppLocale();
  const [isPending, startTransition] = useTransition();
  const categories = getHabitCategories(locale);
  const icons = getHabitIcons(locale);
  const levels = getHabitLevels(locale);

  const copy = locale === "en"
    ? {
        defineTitle: mode === "create" ? "Define your exercise" : "Adjust your exercise",
        defineDescription: "Clear name, simple goal, and exact days make it easier to complete.",
        active: "Active",
        paused: "Paused",
        habitName: "Exercise name",
        habitPlaceholder: "Ex. Push-ups or rope",
        category: "Category",
        categoryPlaceholder: "Select a category",
        dailyGoal: "Daily goal",
        dailyGoalDescription: "You track complete blocks by set. You can measure them by reps or by time.",
        trackingMode: "Tracking mode",
        reps: "Repetitions",
        repsHelper: "Sets with reps per block",
        timer: "Time",
        timerHelper: "Timed sets",
        sets: "Sets",
        timerPerSet: "Time per set (seconds)",
        repsPerSet: "Reps per set",
        timerExample: "Ex. 60 = 1 minute per set.",
        longRoutineHint: "You can schedule long cardio routines or large circuits.",
        scheduledDays: "Scheduled days",
        scheduledDaysDescription: "Tap the days when this exercise repeats.",
        visualStyle: "Visual style",
        visualDescription: "Choose an icon and color so it is easy to spot from today’s view.",
        icon: "Icon",
        color: "Color",
        level: "Level",
        saving: "Saving...",
        createHabit: "Create exercise",
        saveChanges: "Save changes",
        cancel: "Cancel",
        deleteHabit: "Delete exercise",
        deleteConfirm: "Delete this exercise? This action cannot be undone.",
        saveError: "Could not save the exercise.",
        deleteError: "Could not delete the exercise."
      }
    : {
        defineTitle: mode === "create" ? "Define tu ejercicio" : "Ajusta tu ejercicio",
        defineDescription: "Nombre claro, objetivo simple y días exactos para hacerlo más fácil de cumplir.",
        active: "Activo",
        paused: "Pausado",
        habitName: "Nombre del ejercicio",
        habitPlaceholder: "Ej. Lagartijas o cuerda",
        category: "Categoría",
        categoryPlaceholder: "Selecciona una categoría",
        dailyGoal: "Objetivo diario",
        dailyGoalDescription: "Registras bloques completos por serie. Puedes medirlos por repeticiones o por tiempo.",
        trackingMode: "Modo de registro",
        reps: "Repeticiones",
        repsHelper: "Series con reps por bloque",
        timer: "Tiempo",
        timerHelper: "Series cronometradas",
        sets: "Series",
        timerPerSet: "Tiempo por serie (segundos)",
        repsPerSet: "Reps por serie",
        timerExample: "Ej. 60 = 1 minuto por serie.",
        longRoutineHint: "Puedes programar rutinas largas de cardio o circuitos grandes.",
        scheduledDays: "Días programados",
        scheduledDaysDescription: "Toca los días en los que se repetirá el ejercicio.",
        visualStyle: "Estilo visual",
        visualDescription: "Elige un ícono y un color para reconocerlo rápido desde la vista de hoy.",
        icon: "Ícono",
        color: "Color",
        level: "Nivel",
        saving: "Guardando...",
        createHabit: "Crear ejercicio",
        saveChanges: "Guardar cambios",
        cancel: "Cancelar",
        deleteHabit: "Eliminar ejercicio",
        deleteConfirm: "¿Eliminar este ejercicio? Esta acción no se puede deshacer.",
        saveError: "No se pudo guardar el ejercicio.",
        deleteError: "No se pudo eliminar el ejercicio."
      };

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: normalizeHabitFormValues(initialValues),
    mode: "onChange"
  });

  useEffect(() => {
    form.reset(normalizeHabitFormValues(initialValues));
  }, [form, initialValues]);

  const values = form.watch();
  const active = Boolean(form.watch("active"));
  const trackingMode = form.watch("trackingMode");
  const submitting = isPending || form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (rawValues) => {
    form.clearErrors("root");
    const parsedValues = habitSchema.parse(rawValues);

    try {
      if (mode === "create") {
        await createHabitAction(parsedValues);
        startTransition(() => router.push("/today"));
        return;
      }

      if (habitId) {
        await updateHabitAction(habitId, parsedValues);
        startTransition(() => router.push("/"));
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : copy.saveError
      });
    }
  });

  const handleDelete = async () => {
    if (!habitId) {
      return;
    }

    const confirmed = window.confirm(copy.deleteConfirm);
    if (!confirmed) {
      return;
    }

    try {
      await deleteHabitAction(habitId);
      startTransition(() => router.push("/"));
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : copy.deleteError
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{copy.defineTitle}</CardTitle>
            <CardDescription>{copy.defineDescription}</CardDescription>
          </div>
          <button
            type="button"
            onClick={() => form.setValue("active", !active, { shouldDirty: true })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition ring-1",
              active
                ? "bg-accent text-accent-foreground ring-accent/20 shadow-sm"
                : "bg-muted text-card-foreground ring-border"
            )}
          >
            {active ? copy.active : copy.paused}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="name">{copy.habitName}</Label>
            <Input id="name" placeholder={copy.habitPlaceholder} {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="mt-2 text-sm text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="category">{copy.category}</Label>
            <select
              id="category"
              value={values.category ?? ""}
              onChange={(event) =>
                form.setValue("category", (event.target.value || undefined) as HabitFormValues["category"], {
                  shouldDirty: true,
                  shouldValidate: true
                })
              }
              className={selectClassName}
            >
              <option value="">{copy.categoryPlaceholder}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <CardTitle>{copy.dailyGoal}</CardTitle>
          <CardDescription>{copy.dailyGoalDescription}</CardDescription>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label>{copy.trackingMode}</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
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
                        ? "border-accent bg-accent/12 text-accent ring-1 ring-accent/20"
                        : "border-border bg-surface text-card-foreground hover:bg-muted"
                    )}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetSets">{copy.sets}</Label>
              <Input id="targetSets" type="number" min={1} max={999} inputMode="numeric" {...form.register("targetSets")} />
              {form.formState.errors.targetSets ? (
                <p className="mt-2 text-sm text-danger">{form.formState.errors.targetSets.message}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{copy.longRoutineHint}</p>
              )}
            </div>
            <div>
              {trackingMode === "timer" ? (
                <>
                  <Label htmlFor="secondsPerSet">{copy.timerPerSet}</Label>
                  <Input
                    id="secondsPerSet"
                    type="number"
                    min={5}
                    max={7200}
                    inputMode="numeric"
                    placeholder="60"
                    {...form.register("secondsPerSet")}
                  />
                  {form.formState.errors.secondsPerSet ? (
                    <p className="mt-2 text-sm text-danger">{form.formState.errors.secondsPerSet.message}</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{copy.timerExample}</p>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="repsPerSet">{copy.repsPerSet}</Label>
                  <Input id="repsPerSet" type="number" min={1} max={2500} inputMode="numeric" {...form.register("repsPerSet")} />
                  {form.formState.errors.repsPerSet ? (
                    <p className="mt-2 text-sm text-danger">{form.formState.errors.repsPerSet.message}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <CardTitle>{copy.scheduledDays}</CardTitle>
          <CardDescription>{copy.scheduledDaysDescription}</CardDescription>
        </div>
        <div className="mt-5">
          <DaySelector
            value={values.selectedDays}
            onChange={(days) => form.setValue("selectedDays", days, { shouldDirty: true, shouldValidate: true })}
            error={form.formState.errors.selectedDays?.message}
          />
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <CardTitle>{copy.visualStyle}</CardTitle>
          <CardDescription>{copy.visualDescription}</CardDescription>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <Label>{copy.icon}</Label>
            <div className="grid grid-cols-3 gap-3">
              {icons.map((iconOption) => {
                const selected = values.icon === iconOption.value;
                return (
                  <button
                    key={iconOption.value}
                    type="button"
                    onClick={() => form.setValue("icon", iconOption.value, { shouldDirty: true })}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-[24px] border px-3 py-4 text-sm font-semibold transition",
                      selected
                        ? "border-accent bg-accent/12 text-accent ring-1 ring-accent/20"
                        : "border-border bg-surface text-card-foreground hover:bg-muted"
                    )}
                  >
                    <HabitIcon icon={iconOption.value} className="h-5 w-5" />
                    <span>{iconOption.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{copy.color}</Label>
            <div className="grid grid-cols-2 gap-3">
              {HABIT_COLORS.map((colorOption) => {
                const selected = values.color === colorOption.value;
                return (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => form.setValue("color", colorOption.value, { shouldDirty: true })}
                    className={cn(
                      "flex items-center gap-3 rounded-[24px] border px-4 py-3 text-left text-sm font-semibold transition",
                      selected
                        ? `${HABIT_COLOR_STYLES[colorOption.value].border} bg-card text-card-foreground shadow-sm ring-1 ring-border/80`
                        : "border-border bg-surface text-card-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: colorOption.swatch }}
                      aria-hidden="true"
                    />
                    <span>{colorOption.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{copy.level}</Label>
            <div className="grid grid-cols-3 gap-3">
              {levels.map((levelOption) => {
                const selected = values.level === levelOption.value;
                return (
                  <button
                    key={levelOption.value}
                    type="button"
                    onClick={() => form.setValue("level", levelOption.value, { shouldDirty: true })}
                    className={cn(
                      "rounded-[20px] border px-3 py-3 text-sm font-semibold transition",
                      selected
                        ? "border-accent bg-accent/12 text-accent ring-1 ring-accent/20"
                        : "border-border bg-surface text-card-foreground hover:bg-muted"
                    )}
                  >
                    {levelOption.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <HabitPreview values={values} />

      {form.formState.errors.root?.message ? (
        <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {form.formState.errors.root.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? copy.saving : mode === "create" ? copy.createHabit : copy.saveChanges}
        </Button>
        <Link href={mode === "create" ? "/today" : "/"} className={buttonVariants({ variant: "secondary" })}>
          {copy.cancel}
        </Link>
        {mode === "edit" && habitId ? (
          <Button type="button" variant="danger" onClick={() => void handleDelete()} disabled={submitting}>
            {copy.deleteHabit}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

