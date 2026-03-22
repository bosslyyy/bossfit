"use client";

import { useParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { HabitForm } from "@/components/habits/habit-form";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { useAppLocale } from "@/hooks/use-app-locale";
import { normalizeHabitFormValues } from "@/lib/validation/habit";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function EditHabitPage() {
  const params = useParams<{ id: string }>();
  const locale = useAppLocale();
  const { habits, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen title={locale === "en" ? "Loading habit..." : "Cargando hábito..."} />;
  }

  const habit = habits.find((entry) => entry.id === params.id);

  if (!habit) {
    return (
      <div className="space-y-6 animate-rise">
        <PageHeader
          title={locale === "en" ? "Edit habit" : "Editar hábito"}
          description={
            locale === "en"
              ? "We could not find that habit in your current account."
              : "No encontramos ese hábito en tu cuenta actual."
          }
          backHref="/"
        />
        <EmptyState
          title={locale === "en" ? "Habit not found" : "Hábito no encontrado"}
          description={
            locale === "en"
              ? "It may have been deleted or the link may no longer exist."
              : "Puede que haya sido eliminado o que el enlace ya no exista."
          }
          actionLabel={locale === "en" ? "Back to home" : "Volver al inicio"}
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title={locale === "en" ? "Edit habit" : "Editar hábito"}
        description={
          locale === "en"
            ? "Adjust the goal, the days, and the visual identity without losing your structure."
            : "Ajusta el objetivo, los días y la identidad visual sin perder tu estructura."
        }
        backHref="/"
      />
      <HabitForm
        mode="edit"
        habitId={habit.id}
        initialValues={normalizeHabitFormValues({
          name: habit.name,
          category: habit.category,
          trackingMode: habit.trackingMode,
          targetSets: habit.targetSets,
          repsPerSet: habit.repsPerSet,
          secondsPerSet: habit.secondsPerSet,
          restEnabled: habit.restEnabled ?? false,
          restSeconds: habit.restSeconds,
          selectedDays: habit.selectedDays,
          color: habit.color,
          icon: habit.icon,
          level: habit.level,
          active: habit.active
        })}
      />
    </div>
  );
}
