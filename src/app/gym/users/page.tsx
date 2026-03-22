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
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchAdminMembers, type AdminMemberListItem } from "@/lib/supabase/admin";

export default function AdminUsersPage() {
  const { context } = useAdminContext();
  const locale = useAppLocale();
  const [members, setMembers] = useState<AdminMemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load the user list.",
          title: "Gym users",
          description: "Real gym members with their status, coach, group, and current plan. From here you can open the full profile to operate the account.",
          create: "Create user",
          connectedList: "List connected to the gym",
          members: "members",
          needsAttention: "need attention",
          unassigned: "unassigned",
          filtersSoon: "Filters soon",
          loadingTitle: "Loading users",
          loadingDescription: "Fetching the real members of your gym.",
          errorTitle: "We could not load users",
          retry: "Retry",
          emptyTitle: "No members in this gym yet",
          emptyDescription: "When you add users and member-role memberships, they will appear here automatically.",
          manage: "Manage"
        }
      : {
          loadError: "No se pudo cargar la lista de usuarios.",
          title: "Usuarios del gym",
          description: "Miembros reales del gimnasio con su estado, coach, grupo y plan actual. Desde aquí ya puedes abrir su ficha completa para operar la cuenta.",
          create: "Crear usuario",
          connectedList: "Lista conectada al gym",
          members: "miembros",
          needsAttention: "con atenci�n",
          unassigned: "sin asignar",
          filtersSoon: "Filtros pronto",
          loadingTitle: "Cargando usuarios",
          loadingDescription: "Estamos consultando los miembros reales de tu gimnasio.",
          errorTitle: "No pudimos cargar los usuarios",
          retry: "Reintentar",
          emptyTitle: "Aún no hay miembros en este gym",
          emptyDescription: "Cuando agregues usuarios y memberships con rol member, aparecer�n aquí automáticamente.",
          manage: "Gestionar"
        };

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
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/gym/users/new" className={buttonVariants({ variant: "secondary" })}>
            <UserPlus className="mr-2 h-4 w-4" />
            {copy.create}
          </Link>
        }
      />

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[11rem] flex-1 items-center gap-2 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
            <Search className="h-4 w-4" />
            {copy.connectedList}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{members.length} {copy.members}</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{summary.withAttention} {copy.needsAttention}</Badge>
            <Badge className="bg-surface text-card-foreground ring-1 ring-border">{summary.unassigned} {copy.unassigned}</Badge>
          </div>
          <Button variant="outline" disabled>
            <Filter className="mr-2 h-4 w-4" />
            {copy.filtersSoon}
          </Button>
        </div>
      </Card>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && error ? <AdminDataState title={copy.errorTitle} description={error} actionLabel={copy.retry} onAction={() => void loadMembers()} tone="warning" /> : null}
      {!loading && !error && members.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

      {!loading && !error && members.length ? (
        <div className="space-y-4">
          {members.map((member) => (
            <AdminMemberCard
              key={member.membershipId}
              member={member}
              action={
                <Link href={`/gym/users/${member.userId}`} className={buttonVariants({ variant: "outline", className: "h-10 px-3 text-sm" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  {copy.manage}
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
