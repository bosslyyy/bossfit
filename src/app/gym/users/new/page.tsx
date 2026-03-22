"use client";

import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { AdminUserCreateForm } from "@/components/admin/admin-user-create-form";
import { useAppLocale } from "@/hooks/use-app-locale";

export default function AdminUsersNewPage() {
  const locale = useAppLocale();
  const copy =
    locale === "en"
      ? {
          title: "Create user",
          description: "Quick onboarding for members, trainers, or gym admins with automatically generated temporary credentials."
        }
      : {
          title: "Crear usuario",
          description: "Alta rápida de miembros, entrenadores o admins del gym con credenciales temporales generadas automáticamente."
        };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />
      <AdminUserCreateForm />
    </div>
  );
}
