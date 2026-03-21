"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { Search, UserRound, ShieldCheck, PlusCircle } from "lucide-react";

import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlatformAdminManagedUser, fetchPlatformAdminUsers } from "@/lib/supabase/platform-admin";
import type { PlatformAdminUserListItem, PlatformManagedUserCredentials } from "@/types/platform-admin";

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function PlatformAdminUsersPage() {
  const { session } = useSupabaseAuth();
  const [users, setUsers] = useState<PlatformAdminUserListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<PlatformManagedUserCredentials | null>(null);

  const loadUsers = async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextUsers = await fetchPlatformAdminUsers(session.access_token);
      setUsers(nextUsers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios globales.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [session?.access_token]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return users;
    }

    return users.filter((user) => [user.name, user.email, user.username, user.roles.join(" ")].some((value) => value.toLowerCase().includes(needle)));
  }, [query, users]);

  const handleCreateManagedUser = async () => {
    if (!session?.access_token) {
      return;
    }

    setSubmitting(true);
    setCreateError(null);

    try {
      const credentials = await createPlatformAdminManagedUser(session.access_token, { fullName });
      setCreatedCredentials(credentials);
      setFullName("");
      await loadUsers();
    } catch (createManagedUserError) {
      setCreateError(createManagedUserError instanceof Error ? createManagedUserError.message : "No se pudo crear la cuenta gestionada.");
      setCreatedCredentials(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Usuarios globales" description="Control técnico de cuentas BossFit, permisos de plataforma y memberships en todos los gyms." />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Crear cuenta gestionada</CardTitle>
          <CardDescription>Crea un coach, admin o staff fuera de un gym y luego asígnalo desde su ficha técnica.</CardDescription>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
          <div>
            <Label htmlFor="managed-full-name">Nombre completo</Label>
            <Input id="managed-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Daniel Vargas" />
          </div>
          <Button onClick={() => void handleCreateManagedUser()} disabled={submitting || !fullName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </div>

        {createError ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{createError}</div> : null}

        {createdCredentials ? (
          <div className="rounded-[24px] border border-accent/20 bg-accent/10 p-4 text-sm text-card-foreground dark:text-white">
            <p className="font-semibold">Acceso creado</p>
            <p className="mt-2">Usuario: <span className="font-semibold">{createdCredentials.alias}</span></p>
            <p>Email: <span className="font-semibold">{createdCredentials.email}</span></p>
            <p>Contraseña temporal: <span className="font-semibold">{createdCredentials.password}</span></p>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center gap-2 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
          <Search className="h-4 w-4" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" placeholder="Buscar por nombre, email, usuario o rol" />
        </div>
      </Card>

      {loading ? <AdminDataState title="Cargando usuarios" description="Estamos reuniendo cuentas, perfiles y memberships activas." /> : null}
      {!loading && error ? <AdminDataState title="No pudimos cargar los usuarios" description={error} actionLabel="Reintentar" onAction={() => void loadUsers()} tone="warning" /> : null}
      {!loading && !error && filteredUsers.length === 0 ? <AdminDataState title="Sin resultados" description="No encontramos usuarios que coincidan con ese criterio." /> : null}

      {!loading && !error && filteredUsers.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredUsers.map((user) => (
            <Card key={user.userId} className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-card-foreground dark:text-white">{user.name}</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Usuario: {user.username || "Sin username"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.gymCount} gyms</Badge>
                <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.roles.length ? user.roles.join(", ") : "Sin rol gym"}</Badge>
                {user.isManagedAccount ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">Gestionada</Badge> : null}
                {user.isPlatformAdmin ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20"><ShieldCheck className="mr-1 h-3 w-3" />Platform</Badge> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-muted-foreground">Creada</p>
                  <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(user.createdAt)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-muted-foreground">Último acceso</p>
                  <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(user.lastSignInAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/users/${user.userId}`} className={buttonVariants({ variant: "outline" })}>
                  Abrir ficha técnica
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
