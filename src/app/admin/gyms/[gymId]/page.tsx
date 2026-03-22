"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLocale } from "@/hooks/use-app-locale";
import { getIntlLocale } from "@/lib/i18n";
import { attachExistingUserToPlatformGym, fetchPlatformAdminGymDetail, updatePlatformAdminGym } from "@/lib/supabase/platform-admin";
import type { PlatformAdminGymDetail, PlatformAdminGymRole, PlatformAdminMembershipStatus } from "@/types/platform-admin";

const membershipRoles: PlatformAdminGymRole[] = ["owner", "admin", "trainer", "member"];
const membershipStatuses: PlatformAdminMembershipStatus[] = ["active", "invited", "paused", "suspended"];
const selectClassName =
  "h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function formatDate(value: string | undefined, locale: "es" | "en") {
  if (!value) {
    return locale === "en" ? "No date" : "Sin fecha";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function normalizeExtraRoles(primaryRole: PlatformAdminGymRole, extraRoles: PlatformAdminGymRole[] = []) {
  return [...new Set(extraRoles.filter((role) => role !== primaryRole))];
}

function toggleRole(roles: PlatformAdminGymRole[], role: PlatformAdminGymRole) {
  return roles.includes(role) ? roles.filter((current) => current !== role) : [...roles, role];
}

function translateRole(role: PlatformAdminGymRole, locale: "es" | "en") {
  const labels: Record<PlatformAdminGymRole, string> =
    locale === "en"
      ? { owner: "Owner", admin: "Admin", trainer: "Trainer", member: "Member" }
      : { owner: "Owner", admin: "Admin", trainer: "Entrenador", member: "Miembro" };

  return labels[role];
}

function translateStatus(status: PlatformAdminMembershipStatus, locale: "es" | "en") {
  const labels: Record<PlatformAdminMembershipStatus, string> =
    locale === "en"
      ? { active: "Active", invited: "Invited", paused: "Paused", suspended: "Suspended" }
      : { active: "Activo", invited: "Invitado", paused: "Pausado", suspended: "Suspendido" };

  return labels[status];
}

function RoleCheckboxGroup({
  primaryRole,
  extraRoles,
  onChange,
  locale
}: {
  primaryRole: PlatformAdminGymRole;
  extraRoles: PlatformAdminGymRole[];
  onChange: (nextRoles: PlatformAdminGymRole[]) => void;
  locale: "es" | "en";
}) {
  const copy =
    locale === "en"
      ? { title: "Additional roles", primary: "primary" }
      : { title: "Roles adicionales", primary: "principal" };

  return (
    <div className="space-y-2">
      <Label>{copy.title}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {membershipRoles.map((role) => {
          const disabled = role === primaryRole;
          const checked = disabled ? true : extraRoles.includes(role);

          return (
            <label
              key={role}
              className="flex items-center gap-3 rounded-[18px] border border-border bg-background/80 px-4 py-3 text-sm dark:bg-white/[0.04]"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  if (disabled) {
                    return;
                  }

                  onChange(normalizeExtraRoles(primaryRole, toggleRole(extraRoles, role)));
                }}
              />
              <span>{translateRole(role, locale)}</span>
              {disabled ? <span className="text-xs text-muted-foreground">{copy.primary}</span> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function PlatformAdminGymDetailPage() {
  const params = useParams<{ gymId: string }>();
  const gymId = typeof params?.gymId === "string" ? params.gymId : "";
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();
  const [detail, setDetail] = useState<PlatformAdminGymDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<PlatformAdminGymRole>("member");
  const [status, setStatus] = useState<PlatformAdminMembershipStatus>("active");
  const [extraRoles, setExtraRoles] = useState<PlatformAdminGymRole[]>([]);

  const copy =
    locale === "en"
      ? {
          missingGym: "We could not find that gym.",
          loadError: "Could not load the gym profile.",
          saveError: "Could not save the gym.",
          linkError: "Could not link the user to the gym.",
          loadingTitle: "Loading gym",
          loadingDescription: "Gathering memberships, owners, and the operating structure.",
          loadFailedTitle: "Could not load the gym",
          retry: "Retry",
          missingTitle: "We could not find that gym",
          missingDescription: "It may no longer exist or you may not have platform access.",
          description: "Global gym profile for identity, operating status, and active memberships.",
          backToGyms: "Back to gyms",
          owners: "Owners",
          admins: "Admins",
          trainers: "Trainers",
          members: "Members",
          gymSettings: "Gym settings",
          name: "Name",
          slug: "Slug",
          contactEmail: "Contact email",
          phone: "Phone",
          gymActive: "Active gym",
          activeHelper: "If you pause it, it stays visible but will no longer be offered as an active operation.",
          created: "Created",
          memberships: "Memberships",
          effectiveOwners: "Effective owners",
          saving: "Saving...",
          saveGym: "Save gym",
          linkExistingUser: "Link existing user",
          linkDescription: "Add a natural or managed account by email or username without creating duplicates.",
          usernameOrEmail: "Username or email",
          usernameOrEmailPlaceholder: "email or username",
          primaryRole: "Primary role",
          status: "Status",
          linking: "Linking...",
          addToGym: "Add to gym",
          linkedUsers: "Linked users",
          linkedUsersDescription: "Central control of owners, admins, trainers, and members inside this gym.",
          username: "Username",
          noUsername: "No username",
          managed: "Managed",
          platform: "Platform",
          openProfile: "Open technical profile"
        }
      : {
          missingGym: "No encontramos ese gym.",
          loadError: "No se pudo cargar la ficha del gym.",
          saveError: "No se pudo guardar el gym.",
          linkError: "No se pudo vincular el usuario al gym.",
          loadingTitle: "Cargando gym",
          loadingDescription: "Estamos reuniendo memberships, owners y estructura operativa.",
          loadFailedTitle: "No pudimos cargar el gym",
          retry: "Reintentar",
          missingTitle: "No encontramos ese gym",
          missingDescription: "Puede que ya no exista o que no tengas acceso de plataforma.",
          description: "Ficha global del gym para identidad, estado operativo y memberships activas.",
          backToGyms: "Volver a gyms",
          owners: "Owners",
          admins: "Admins",
          trainers: "Trainers",
          members: "Miembros",
          gymSettings: "Configuraci�n del gym",
          name: "Nombre",
          slug: "Slug",
          contactEmail: "Email de contacto",
          phone: "Telefono",
          gymActive: "Gym activo",
          activeHelper: "Si lo pausas, seguirá visible pero ya no se propondrá como grupo operativo.",
          created: "Creado",
          memberships: "Memberships",
          effectiveOwners: "Owners efectivos",
          saving: "Guardando...",
          saveGym: "Guardar gym",
          linkExistingUser: "Vincular usuario existente",
          linkDescription: "Agrega una cuenta natural o gestionada por email o username sin crear duplicados.",
          usernameOrEmail: "Usuario o email",
          usernameOrEmailPlaceholder: "email o username",
          primaryRole: "Rol principal",
          status: "Estado",
          linking: "Vinculando...",
          addToGym: "Agregar al gym",
          linkedUsers: "Usuarios vinculados",
          linkedUsersDescription: "Control central de owners, admins, trainers y members dentro de este gym.",
          username: "Usuario",
          noUsername: "Sin username",
          managed: "Gestionada",
          platform: "Platform",
          openProfile: "Abrir ficha tecnica"
        };

  const loadDetail = async () => {
    if (!session?.access_token || !gymId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextDetail = await fetchPlatformAdminGymDetail(session.access_token, gymId);
      if (!nextDetail) {
        setDetail(null);
        setError(copy.missingGym);
        return;
      }

      setDetail(nextDetail);
      setName(nextDetail.name);
      setSlug(nextDetail.slug);
      setContactEmail(nextDetail.contactEmail);
      setPhone(nextDetail.phone);
      setActive(nextDetail.active);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [session?.access_token, gymId]);

  useEffect(() => {
    setExtraRoles((current) => normalizeExtraRoles(role, current));
  }, [role]);

  const handleSaveGym = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nextDetail = await updatePlatformAdminGym(session.access_token, detail.id, {
        name,
        slug,
        contactEmail,
        phone,
        active
      });

      if (nextDetail) {
        setDetail(nextDetail);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkUser = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    setLinking(true);
    setError(null);

    try {
      const nextDetail = await attachExistingUserToPlatformGym(session.access_token, detail.id, {
        identifier,
        role,
        status,
        extraRoles
      });

      if (nextDetail) {
        setDetail(nextDetail);
        setIdentifier("");
        setExtraRoles([]);
      }
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : copy.linkError);
    } finally {
      setLinking(false);
    }
  };

  const owners = useMemo(
    () => detail?.memberships.filter((membership) => membership.effectiveRoles.includes("owner")) ?? [],
    [detail?.memberships]
  );

  if (loading) {
    return <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} />;
  }

  if (error && !detail) {
    return (
      <AdminDataState
        title={copy.loadFailedTitle}
        description={error}
        actionLabel={copy.retry}
        onAction={() => void loadDetail()}
        tone="warning"
      />
    );
  }

  if (!detail) {
    return <AdminDataState title={copy.missingTitle} description={copy.missingDescription} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.name}
        description={copy.description}
        action={
          <Link href="/admin/gyms" className={buttonVariants({ variant: "outline" })}>
            {copy.backToGyms}
          </Link>
        }
      />

      {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.owners}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.ownersCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.admins}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.adminsCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.trainers}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.trainersCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.members}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.membersCount}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.gymSettings}</CardTitle>
            <CardDescription>ID: {detail.id}</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{copy.name}</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label>{copy.slug}</Label>
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </div>
            <div>
              <Label>{copy.contactEmail}</Label>
              <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contact@gym.com" />
            </div>
            <div>
              <Label>{copy.phone}</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 ..." />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm dark:bg-white/[0.04]">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            <span>{copy.gymActive}</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.created}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.createdAt, locale)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.memberships}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{detail.totalMemberships}</p>
            </div>
          </div>

          {owners.length ? (
            <div className="rounded-[22px] border border-border bg-background/80 p-4 text-sm dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.effectiveOwners}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {owners.map((membership) => (
                  <Badge key={membership.membershipId} className="bg-surface text-card-foreground ring-1 ring-border">
                    {membership.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <Button onClick={() => void handleSaveGym()} disabled={saving}>{saving ? copy.saving : copy.saveGym}</Button>
        </Card>

        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.linkExistingUser}</CardTitle>
            <CardDescription>{copy.linkDescription}</CardDescription>
          </div>

          <div>
            <Label>{copy.usernameOrEmail}</Label>
            <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={copy.usernameOrEmailPlaceholder} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{copy.primaryRole}</Label>
              <select className={selectClassName} value={role} onChange={(event) => setRole(event.target.value as PlatformAdminGymRole)}>
                {membershipRoles.map((item) => <option key={item} value={item}>{translateRole(item, locale)}</option>)}
              </select>
            </div>
            <div>
              <Label>{copy.status}</Label>
              <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as PlatformAdminMembershipStatus)}>
                {membershipStatuses.map((item) => <option key={item} value={item}>{translateStatus(item, locale)}</option>)}
              </select>
            </div>
          </div>

          <RoleCheckboxGroup primaryRole={role} extraRoles={extraRoles} onChange={setExtraRoles} locale={locale} />

          <Button onClick={() => void handleLinkUser()} disabled={linking || !identifier.trim()}>
            {linking ? copy.linking : copy.addToGym}
          </Button>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.linkedUsers}</CardTitle>
          <CardDescription>{copy.linkedUsersDescription}</CardDescription>
        </div>

        <div className="space-y-4">
          {detail.memberships.map((membership) => (
            <div key={membership.membershipId} className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-card-foreground dark:text-white">{membership.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{membership.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.username}: {membership.username || copy.noUsername}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{translateRole(membership.role, locale)}</Badge>
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{translateStatus(membership.status, locale)}</Badge>
                  {membership.isManagedAccount ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{copy.managed}</Badge> : null}
                  {membership.isPlatformAdmin ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">{copy.platform}</Badge> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {membership.effectiveRoles.map((membershipRole) => (
                  <Badge key={`${membership.membershipId}-${membershipRole}`} className="bg-surface text-card-foreground ring-1 ring-border">
                    {translateRole(membershipRole, locale)}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/admin/users/${membership.userId}`} className={buttonVariants({ variant: "outline" })}>
                  {copy.openProfile}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
