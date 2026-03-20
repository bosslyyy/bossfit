"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { Eye, Filter, Search, UserPlus } from "lucide-react";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminMemberCard } from "@/components/admin/admin-member-card";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchAdminMembers, type AdminMemberListItem } from "@/lib/supabase/admin";

export default function AdminUsersPage() {
  const { context } = useAdminContext();
  const [members, setMembers] = useState<AdminMemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const withAttention = members.filter((member) => member.assignmentStatus !== "active").length;
    const unassigned = members.filter((member) => member.assignmentStatus === "unassigned").length;
    return { withAttention, unassigned };
  }, [members]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextMembers = await fetchAdminMembers(context.gymId);
      setMembers(nextMembers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de usuarios.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [context.gymId]);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Usuarios del gym"
        description="Miembros reales del gimnasio con su estado, coach, grupo y plan actual. Desde aquí ya puedes abrir su ficha completa para operar la cuenta."
        action={
          <Link href="/admin/users/new" className={buttonVariants({ variant: "secondary" })}>
            <UserPlus className="mr-2 h-4 w-4" />
            Crear usuario
          </Link>
        }
      />

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[11rem] flex-1 items-center gap-2 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
            <Search className="h-4 w-4" />
            Lista conectada a Supabase
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{members.length} miembros</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{summary.withAttention} con atención</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{summary.unassigned} sin asignar</Badge>
          </div>
          <Button variant="outline" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtros pronto
          </Button>
        </div>
      </Card>

      {loading ? <AdminDataState title="Cargando usuarios" description="Estamos consultando los miembros reales de tu gimnasio." /> : null}
      {!loading && error ? <AdminDataState title="No pudimos cargar los usuarios" description={error} actionLabel="Reintentar" onAction={() => void loadMembers()} tone="warning" /> : null}
      {!loading && !error && members.length === 0 ? <AdminDataState title="Aún no hay miembros en este gym" description="Cuando agregues usuarios y memberships con rol member, aparecerán aquí automáticamente." /> : null}

      {!loading && !error && members.length ? (
        <div className="space-y-4">
          {members.map((member) => (
            <AdminMemberCard
              key={member.membershipId}
              member={member}
              action={
                <Link href={`/admin/users/${member.userId}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  Gestionar
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
