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
import {
  HABIT_CATEGORIES,
  HABIT_COLORS,
  HABIT_COLOR_STYLES,
  HABIT_ICONS,
  HABIT_LEVELS
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { habitDefaultValues, habitSchema, type HabitFormValues } from "@/lib/validation/habit";
import { useBossFitStore } from "@/store/use-bossfit-store";

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
  const [isPending, startTransition] = useTransition();
  const addHabit = useBossFitStore((state) => state.addHabit);
  const updateHabit = useBossFitStore((state) => state.updateHabit);
  const deleteHabit = useBossFitStore((state) => state.deleteHabit);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: initialValues ?? habitDefaultValues,
    mode: "onChange"
  });

  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
    }
  }, [form, initialValues]);

  const values = form.watch();
  const active = form.watch("active");
  const submitting = isPending || form.formState.isSubmitting;

  const onSubmit = form.handleSubmit((rawValues) => {
    const values = habitSchema.parse(rawValues);

    if (mode === "create") {
      addHabit(values);
      startTransition(() => router.push("/today"));
      return;
    }

    if (habitId) {
      updateHabit(habitId, values);
      startTransition(() => router.push("/"));
    }
  });

  const handleDelete = () => {
    if (!habitId) {
      return;
    }

    const confirmed = window.confirm("¿Eliminar este hábito? Esta acción no se puede deshacer.");
    if (!confirmed) {
      return;
    }

    deleteHabit(habitId);
    startTransition(() => router.push("/"));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{mode === "create" ? "Define tu hábito" : "Ajusta tu hábito"}</CardTitle>
            <CardDescription>
              Nombre claro, objetivo simple y días exactos para hacerlo más fácil de cumplir.
            </CardDescription>
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
            {active ? "Activo" : "Pausado"}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="name">Nombre del hábito</Label>
            <Input id="name" placeholder="Ej. Lagartijas" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="mt-2 text-sm text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
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
              <option value="">Selecciona una categoría</option>
              {HABIT_CATEGORIES.map((category) => (
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
          <CardTitle>Objetivo diario</CardTitle>
          <CardDescription>Registras bloques completos por serie, no repetición por repetición.</CardDescription>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="targetSets">Series</Label>
            <Input id="targetSets" type="number" min={1} max={12} inputMode="numeric" {...form.register("targetSets")} />
            {form.formState.errors.targetSets ? (
              <p className="mt-2 text-sm text-danger">{form.formState.errors.targetSets.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="repsPerSet">Reps por serie</Label>
            <Input id="repsPerSet" type="number" min={1} max={250} inputMode="numeric" {...form.register("repsPerSet")} />
            {form.formState.errors.repsPerSet ? (
              <p className="mt-2 text-sm text-danger">{form.formState.errors.repsPerSet.message}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <CardTitle>Días programados</CardTitle>
          <CardDescription>Toca los días en los que se repetirá el hábito.</CardDescription>
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
          <CardTitle>Estilo visual</CardTitle>
          <CardDescription>Elige un ícono y un color para reconocerlo rápido desde la vista de hoy.</CardDescription>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <Label>Ícono</Label>
            <div className="grid grid-cols-3 gap-3">
              {HABIT_ICONS.map((iconOption) => {
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
            <Label>Color</Label>
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
            <Label>Nivel</Label>
            <div className="grid grid-cols-3 gap-3">
              {HABIT_LEVELS.map((levelOption) => {
                const selected = values.level === levelOption.value;
                return (
                  <button
                    key={levelOption.value}
                    type="button"
                    onClick={() => form.setValue("level", levelOption.value, { shouldDirty: true })}
                    className={cn(
                      "rounded-[20px] border px-3 py-3 text-sm font-semibold transition",
                      selected
                        ? "border-accent bg-accent text-accent-foreground"
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

      <div className="sticky bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-20 rounded-[28px] border border-border bg-background/96 p-3 shadow-soft backdrop-blur-md supports-[backdrop-filter]:bg-background/92">
        <div className="flex gap-3">
          {mode === "edit" ? (
            <Button type="button" variant="danger" className="flex-1" onClick={handleDelete}>
              Eliminar
            </Button>
          ) : (
            <Link href="/" className={buttonVariants({ variant: "secondary", className: "flex-1" })}>
              Cancelar
            </Link>
          )}
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "Guardando..." : mode === "create" ? "Crear hábito" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
