"use client";

import { useAppLocale } from "@/hooks/use-app-locale";

import { HabitForm } from "@/components/habits/habit-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewHabitPage() {
  const locale = useAppLocale();

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title={locale === "en" ? "Create habit" : "Crear hábito"}
        description={
          locale === "en"
            ? "Design a clear, tactile routine that is easy to sustain from mobile."
            : "Diseña una rutina clara, táctil y fácil de sostener desde el móvil."
        }
        backHref="/"
      />
      <HabitForm mode="create" />
    </div>
  );
}
