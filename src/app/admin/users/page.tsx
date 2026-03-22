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
import { useAppLocale } from "@/hooks/use-app-locale";
import { createPlatformAdminManagedUser, fetchPlatformAdminUsers } from "@/lib/supabase/platform-admin";
import type { PlatformAdminUserListItem, PlatformManagedUserCredentials } from "@/types/platform-admin";

export default function PlatformAdminUsersPage() {
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();
  const [users, setUsers] = useState<PlatformAdminUserListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<PlatformManagedUserCredentials | null>(null);

  const copy =
    locale === "en"
      ? {
          noDate: "No date",
          loadError: "Could not load global users.",
          createError: "Could not create the managed account.",
          title: "Global users",
          description: "Technical control of BossFit accounts, platform permissions, and memberships across all gyms.",
          createTitle: "Create managed account",
          createDescription: "Create a coach, admin, or staff account outside a gym and assign it later from the technical profile.",
          fullName: "Full name",
          fullNamePlaceholder: "Ex. Daniel Vargas",
          creating: "Creating account...",
          create: "Create account",
          accessCreated: "Access created",
          username: "Username",
          tempPassword: "Temporary password",
          search: "Search by name, email, username, or role",
          loadingTitle: "Loading users",
          loadingDescription: "Collecting accounts, profiles, and active memberships.",
          errorTitle: "We could not load users",
          retry: "Retry",
          emptyTitle: "No results",
          emptyDescription: "No users matched that filter.",
          user: "Username",
          noUsername: "No username",
          gyms: "gyms",
          noGymRole: "No gym role",
          managed: "Managed",
          created: "Created",
          lastAccess: "Last access",
          openProfile: "Open technical profile"
        }
      : {
          noDate: "Sin fecha",
          loadError: "No se pudieron cargar los usuarios globales.",
          createError: "No se pudo crear la cuenta gestionada.",
          title: "Usuarios globales",
          description: "Control técnico de cuentas BossFit, permisos de plataforma y memberships en todos los gyms.",
          createTitle: "Crear cuenta gestionada",
          createDescription: "Crea un coach, admin o staff fuera de un gym y luego asígnalo desde su ficha técnica.",
          fullName: "Nombre completo",
          fullNamePlaceholder: "Ej. Daniel Vargas",
          creating: "Creando cuenta...",
          create: "Crear cuenta",
          accessCreated: "Acceso creado",
          username: "Usuario",
          tempPassword: "Contraseña temporal",
          search: "Buscar por nombre, email, usuario o rol",
          loadingTitle: "Cargando usuarios",
          loadingDescription: "Estamos reuniendo cuentas, perfiles y memberships activas.",
          errorTitle: "No pudimos cargar los usuarios",
          retry: "Reintentar",
          emptyTitle: "Sin resultados",
          emptyDescription: "No encontramos usuarios que coincidan con ese criterio.",
          user: "Usuario",
          noUsername: "Sin username",
          gyms: "gyms",
          noGymRole: "Sin rol gym",
          managed: "Gestionada",
          created: "Creada",
          lastAccess: "Último acceso",
          openProfile: "Abrir ficha técnica"
        };

  const formatDate = (value?: string) => {
    if (!value) {
      return copy.noDate;
    }

    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  };

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
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
      setCreateError(createManagedUserError instanceof Error ? createManagedUserError.message : copy.createError);
      setCreatedCredentials(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.createTitle}</CardTitle>
          <CardDescription>{copy.createDescription}</CardDescription>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
          <div>
            <Label htmlFor="managed-full-name">{copy.fullName}</Label>
            <Input id="managed-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={copy.fullNamePlaceholder} />
          </div>
          <Button onClick={() => void handleCreateManagedUser()} disabled={submitting || !fullName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {submitting ? copy.creating : copy.create}
          </Button>
        </div>

        {createError ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{createError}</div> : null}

        {createdCredentials ? (
          <div className="rounded-[24px] border border-accent/20 bg-accent/10 p-4 text-sm text-card-foreground dark:text-white">
            <p className="font-semibold">{copy.accessCreated}</p>
            <p className="mt-2">{copy.username}: <span className="font-semibold">{createdCredentials.alias}</span></p>
            <p>Email: <span className="font-semibold">{createdCredentials.email}</span></p>
            <p>{copy.tempPassword}: <span className="font-semibold">{createdCredentials.password}</span></p>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="flex items-center gap-2 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
          <Search className="h-4 w-4" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" placeholder={copy.search} />
        </div>
      </Card>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && error ? <AdminDataState title={copy.errorTitle} description={error} actionLabel={copy.retry} onAction={() => void loadUsers()} tone="warning" /> : null}
      {!loading && !error && filteredUsers.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

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
                  <p className="mt-1 text-sm text-muted-foreground">{copy.user}: {user.username || copy.noUsername}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.gymCount} {copy.gyms}</Badge>
                <Badge className="bg-surface text-card-foreground ring-1 ring-border">{user.roles.length ? user.roles.join(", ") : copy.noGymRole}</Badge>
                {user.isManagedAccount ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{copy.managed}</Badge> : null}
                {user.isPlatformAdmin ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20"><ShieldCheck className="mr-1 h-3 w-3" />Platform</Badge> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-muted-foreground">{copy.created}</p>
                  <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(user.createdAt)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-muted-foreground">{copy.lastAccess}</p>
                  <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(user.lastSignInAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/users/${user.userId}`} className={buttonVariants({ variant: "outline" })}>
                  {copy.openProfile}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
