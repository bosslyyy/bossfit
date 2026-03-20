import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { AdminUserCreateForm } from "@/components/admin/admin-user-create-form";

export default function AdminUsersNewPage() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Crear usuario"
        description="Alta rápida de miembros, entrenadores o admins del gym con credenciales temporales generadas automáticamente."
      />
      <AdminUserCreateForm />
    </div>
  );
}
