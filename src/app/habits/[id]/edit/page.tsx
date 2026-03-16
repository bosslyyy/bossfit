"use client";

import { useParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { HabitForm } from "@/components/habits/habit-form";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function EditHabitPage() {
  const params = useParams<{ id: string }>();
  const { habits, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      hasHydrated: state.hasHydrated
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen title="Cargando hábito..." />;
  }

  const habit = habits.find((entry) => entry.id === params.id);

  if (!habit) {
    return (
      <div className="space-y-6 animate-rise">
        <PageHeader title="Editar hábito" description="No encontramos ese hábito en tu dispositivo." backHref="/" />
        <EmptyState
          title="Hábito no encontrado"
          description="Puede que haya sido eliminado o que el enlace ya no exista."
          actionLabel="Volver al inicio"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Editar hábito"
        description="Ajusta el objetivo, los días y la identidad visual sin perder tu estructura."
        backHref="/"
      />
      <HabitForm
        mode="edit"
        habitId={habit.id}
        initialValues={{
          name: habit.name,
          category: habit.category,
          targetSets: habit.targetSets,
          repsPerSet: habit.repsPerSet,
          selectedDays: habit.selectedDays,
          color: habit.color,
          icon: habit.icon,
          level: habit.level,
          active: habit.active
        }}
      />
    </div>
  );
}
