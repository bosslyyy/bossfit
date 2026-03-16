"use client";

import { HabitForm } from "@/components/habits/habit-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewHabitPage() {
  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Crear hábito"
        description="Diseña una rutina clara, táctil y fácil de sostener desde el móvil."
        backHref="/"
      />
      <HabitForm mode="create" />
    </div>
  );
}
