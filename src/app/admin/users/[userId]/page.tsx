"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, ShieldCheck, UserRound } from "lucide-react";

import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLocale } from "@/hooks/use-app-locale";
import { getIntlLocale } from "@/lib/i18n";
import {
  addPlatformAdminUserToGym,
  fetchPlatformAdminGyms,
  fetchPlatformAdminUserDetail,
  updatePlatformAdminUser,
  updatePlatformAdminUserMembership
} from "@/lib/supabase/platform-admin";
import type {
  PlatformAdminGymListItem,
  PlatformAdminGymRole,
  PlatformAdminMembershipStatus,
  PlatformAdminUserDetail,
  PlatformAdminUserMembershipItem
} from "@/types/platform-admin";

const membershipStatuses: PlatformAdminMembershipStatus[] = ["active", "invited", "paused", "suspended"];
const membershipRoles: PlatformAdminGymRole[] = ["owner", "admin", "trainer", "member"];
const selectClassName =
  "h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

type MembershipDraft = {
  role: PlatformAdminGymRole;
  status: PlatformAdminMembershipStatus;
  extraRoles: PlatformAdminGymRole[];
};

function normalizeExtraRoles(primaryRole: PlatformAdminGymRole, extraRoles: PlatformAdminGymRole[] = []) {
  return [...new Set(extraRoles.filter((role) => role !== primaryRole))];
}

function toMembershipDraft(membership: PlatformAdminUserMembershipItem): MembershipDraft {
  return {
    role: membership.role,
    status: membership.status,
    extraRoles: normalizeExtraRoles(membership.role, membership.extraRoles)
  };
}

function toggleRole(roles: PlatformAdminGymRole[], role: PlatformAdminGymRole) {
  return roles.includes(role) ? roles.filter((current) => current !== role) : [...roles, role];
}

function formatDate(value: string | undefined, locale: "es" | "en", withTime = true) {
  if (!value) {
    return locale === "en" ? "No date" : "Sin fecha";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

function translateRole(role: PlatformAdminGymRole, locale: "es" | "en") {
  const labels: Record<PlatformAdminGymRole, string> =
    locale === "en"
      ? { owner: "Owner", admin: "Admin", trainer: "Trainer", member: "Member" }
      : { owner: "Owner", admin: "Admin", trainer: "Entrenador", member: "Miembro" };

  return labels[role];
}

function translateMembershipStatus(status: PlatformAdminMembershipStatus, locale: "es" | "en") {
  const labels: Record<PlatformAdminMembershipStatus, string> =
    locale === "en"
      ? { active: "Active", invited: "Invited", paused: "Paused", suspended: "Suspended" }
      : { active: "Activo", invited: "Invitado", paused: "Pausado", suspended: "Suspendido" };

  return labels[status];
}

function translateAssignmentStatus(status: PlatformAdminUserMembershipItem["assignmentStatus"], locale: "es" | "en") {
  const labels =
    locale === "en"
      ? { active: "Active", pending: "Pending", paused: "Paused" }
      : { active: "Activa", pending: "Pendiente", paused: "Pausada" };

  return status ? labels[status] : locale === "en" ? "No assignment" : "Sin asignaciÃ³n";
}

function translateSaveReason(value: string | undefined, locale: "es" | "en") {
  if (!value) {
    return locale === "en" ? "updated" : "actualizado";
  }

  const labels: Record<string, string> =
    locale === "en"
      ? {
          sync: "sync",
          reset: "reset",
          signout: "sign out",
          pagehide: "background",
          bootstrap: "bootstrap",
          recovery: "recovery"
        }
      : {
          sync: "sync",
          reset: "reinicio",
          signout: "cierre de sesiÃ³n",
          pagehide: "segundo plano",
          bootstrap: "bootstrap",
          recovery: "recuperaciÃ³n"
        };

  return labels[value] ?? value;
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
      ? {
          title: "Additional roles",
          primary: "primary"
        }
      : {
          title: "Roles adicionales",
          primary: "principal"
        };

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

export default function PlatformAdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = typeof params?.userId === "string" ? params.userId : "";
  const { session } = useSupabaseAuth();
  const locale = useAppLocale();
  const [detail, setDetail] = useState<PlatformAdminUserDetail | null>(null);
  const [gyms, setGyms] = useState<PlatformAdminGymListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingMembership, setAddingMembership] = useState(false);
  const [membershipSavingId, setMembershipSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [platformAdminActive, setPlatformAdminActive] = useState(false);
  const [platformAdminLabel, setPlatformAdminLabel] = useState("");
  const [selectedGymId, setSelectedGymId] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformAdminGymRole>("member");
  const [selectedStatus, setSelectedStatus] = useState<PlatformAdminMembershipStatus>("active");
  const [selectedExtraRoles, setSelectedExtraRoles] = useState<PlatformAdminGymRole[]>([]);
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, MembershipDraft>>({});

  const copy =
    locale === "en"
      ? {
          notFound: "We could not find that account.",
          loadError: "Could not load the technical profile.",
          saveError: "Could not save the technical profile.",
          addGymError: "Could not link the user to the gym.",
          membershipError: "Could not update the membership.",
          loadingTitle: "Loading technical profile",
          loadingDescription: "Gathering identity, permissions, and gym memberships.",
          retry: "Retry",
          missingTitle: "We could not find that account",
          missingDescription: "It may no longer exist or may not have synced its profile yet.",
          titleDescription: "Global technical profile for identity, platform permissions, and gym memberships.",
          backToUsers: "Back to users",
          account: "Account",
          gyms: "Gyms",
          habits: "Exercises",
          sync: "Sync",
          currentLevel: "current level",
          linkedMemberships: "linked memberships",
          completions: "completions",
          globalIdentity: "Identity and global permissions",
          platformLabel: "Platform label",
          managedType: "Managed",
          naturalType: "Natural",
          email: "Email",
          username: "Username",
          fullName: "Full name",
          platformLabelField: "Platform label",
          fullPlatformAccess: "Grant full platform permissions (/admin)",
          created: "Created",
          lastAccess: "Last access",
          emailConfirmed: "Email confirmed",
          type: "Type",
          saveProfile: "Save profile",
          saving: "Saving...",
          addToGym: "Add to a gym",
          addToGymDescription: "Turn a natural or managed account into a member, trainer, admin, or owner of an existing gym.",
          gym: "Gym",
          primaryRole: "Primary role",
          status: "Status",
          noGymsAvailable: "No gyms available",
          linking: "Linking...",
          addToGymAction: "Add to gym",
          gymPermissions: "Permissions by gym",
          gymPermissionsDescription: "Manage primary role, secondary roles, and status without changing the account identity.",
          noMembershipTitle: "This account does not belong to any gym",
          noMembershipDescription: "Use the form above to link it to its first operation.",
          assignment: "Assignment",
          noTrainer: "No trainer",
          noGroup: "No group",
          saveMembership: "Save membership"
        }
      : {
          notFound: "No encontramos esa cuenta.",
          loadError: "No se pudo cargar la ficha tÃ©cnica.",
          saveError: "No se pudo guardar la ficha tÃ©cnica.",
          addGymError: "No se pudo vincular el usuario al gym.",
          membershipError: "No se pudo actualizar la membership.",
          loadingTitle: "Cargando ficha tÃ©cnica",
          loadingDescription: "Estamos reuniendo identidad, permisos y memberships del usuario.",
          retry: "Reintentar",
          missingTitle: "No encontramos esa cuenta",
          missingDescription: "Puede que ya no exista o que no haya sincronizado su perfil.",
          titleDescription: "Ficha tÃ©cnica global para identidad, permisos de plataforma y memberships por gym.",
          backToUsers: "Volver a usuarios",
          account: "Cuenta",
          gyms: "Gyms",
          habits: "Ejercicios",
          sync: "Sync",
          currentLevel: "nivel actual",
          linkedMemberships: "memberships vinculadas",
          completions: "completions",
          globalIdentity: "Identidad y permisos globales",
          platformLabel: "Etiqueta platform",
          managedType: "Gestionada",
          naturalType: "Natural",
          email: "Email",
          username: "Username",
          fullName: "Nombre completo",
          platformLabelField: "Etiqueta platform",
          fullPlatformAccess: "Dar permisos de plataforma completos (/admin)",
          created: "Creada",
          lastAccess: "Ãšltimo acceso",
          emailConfirmed: "Email confirmado",
          type: "Tipo",
          saveProfile: "Guardar ficha",
          saving: "Guardando...",
          addToGym: "Agregar a un gym",
          addToGymDescription: "Convierte una cuenta natural o gestionada en miembro, trainer, admin u owner de un gym existente.",
          gym: "Gym",
          primaryRole: "Rol principal",
          status: "Estado",
          noGymsAvailable: "Sin gyms disponibles",
          linking: "Vinculando...",
          addToGymAction: "Agregar al gym",
          gymPermissions: "Permisos por gym",
          gymPermissionsDescription: "Gestiona rol principal, roles adicionales y estado sin tocar la identidad global de la cuenta.",
          noMembershipTitle: "Esta cuenta no pertenece a ningï¿½n gym",
          noMembershipDescription: "Usa el formulario superior para vincularla a su primera operaciÃ³n.",
          assignment: "Asignaciï¿½n",
          noTrainer: "Sin entrenador",
          noGroup: "Sin grupo",
          saveMembership: "Guardar membership"
        };

  const hydrateDetail = (nextDetail: PlatformAdminUserDetail) => {
    setDetail(nextDetail);
    setFullName(nextDetail.fullName || nextDetail.name);
    setUsername(nextDetail.username || "");
    setPlatformAdminActive(nextDetail.platformAdminActive);
    setPlatformAdminLabel(nextDetail.platformAdminLabel || "");
    setMembershipDrafts(
      Object.fromEntries(nextDetail.memberships.map((membership) => [membership.gymId, toMembershipDraft(membership)]))
    );
  };

  const loadDetail = async () => {
    if (!session?.access_token || !userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextDetail, nextGyms] = await Promise.all([
        fetchPlatformAdminUserDetail(session.access_token, userId),
        fetchPlatformAdminGyms(session.access_token)
      ]);

      if (!nextDetail) {
        setDetail(null);
        setError(copy.notFound);
        return;
      }

      hydrateDetail(nextDetail);
      setGyms(nextGyms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [session?.access_token, userId]);

  const availableGyms = useMemo(() => {
    const linkedGymIds = new Set(detail?.memberships.map((membership) => membership.gymId) ?? []);
    return gyms.filter((gym) => !linkedGymIds.has(gym.id));
  }, [detail?.memberships, gyms]);

  useEffect(() => {
    if (!selectedGymId && availableGyms.length) {
      setSelectedGymId(availableGyms[0].id);
    }

    if (!availableGyms.length) {
      setSelectedGymId("");
    }
  }, [availableGyms, selectedGymId]);

  useEffect(() => {
    setSelectedExtraRoles((current) => normalizeExtraRoles(selectedRole, current));
  }, [selectedRole]);

  const handleSaveProfile = async () => {
    if (!session?.access_token || !detail) {
      return;
    }

    setSavingProfile(true);
    setError(null);

    try {
      const nextDetail = await updatePlatformAdminUser(session.access_token, detail.userId, {
        fullName,
        username,
        platformAdminActive,
        platformAdminLabel
      });

      if (nextDetail) {
        hydrateDetail(nextDetail);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddMembership = async () => {
    if (!session?.access_token || !detail || !selectedGymId) {
      return;
    }

    setAddingMembership(true);
    setError(null);

    try {
      const nextDetail = await addPlatformAdminUserToGym(session.access_token, detail.userId, {
        gymId: selectedGymId,
        role: selectedRole,
        status: selectedStatus,
        extraRoles: selectedExtraRoles
      });

      if (nextDetail) {
        hydrateDetail(nextDetail);
        setSelectedExtraRoles([]);
      }
    } catch (membershipError) {
      setError(membershipError instanceof Error ? membershipError.message : copy.addGymError);
    } finally {
      setAddingMembership(false);
    }
  };

  const handleSaveMembership = async (gymId: string) => {
    if (!session?.access_token || !detail) {
      return;
    }

    const draft = membershipDrafts[gymId];
    if (!draft) {
      return;
    }

    setMembershipSavingId(gymId);
    setError(null);

    try {
      const nextDetail = await updatePlatformAdminUserMembership(session.access_token, detail.userId, gymId, draft);
      if (nextDetail) {
        hydrateDetail(nextDetail);
      }
    } catch (membershipError) {
      setError(membershipError instanceof Error ? membershipError.message : copy.membershipError);
    } finally {
      setMembershipSavingId(null);
    }
  };

  if (loading) {
    return <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} />;
  }

  if (error && !detail) {
    return <AdminDataState title={copy.loadError} description={error} actionLabel={copy.retry} onAction={() => void loadDetail()} tone="warning" />;
  }

  if (!detail) {
    return <AdminDataState title={copy.missingTitle} description={copy.missingDescription} tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.name}
        description={copy.titleDescription}
        action={<Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>{copy.backToUsers}</Link>}
      />

      {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4 text-accent" /> {copy.account}</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.technicalState.level}</p>
          <p className="text-sm text-muted-foreground">{copy.currentLevel}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4 text-accent" /> {copy.gyms}</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.memberships.length}</p>
          <p className="text-sm text-muted-foreground">{copy.linkedMemberships}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" /> {copy.habits}</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.technicalState.habitsCount}</p>
          <p className="text-sm text-muted-foreground">{copy.completions}: {detail.technicalState.completionsCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" /> {copy.sync}</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">r{detail.technicalState.revision}</p>
          <p className="text-sm text-muted-foreground">{formatDate(detail.technicalState.updatedAt, locale)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.globalIdentity}</CardTitle>
            <CardDescription>ID: {detail.userId}</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{copy.email}</Label>
              <Input value={detail.email} disabled />
            </div>
            <div>
              <Label>{copy.username}</Label>
              <Input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="username" />
            </div>
            <div>
              <Label>{copy.fullName}</Label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={copy.fullName} />
            </div>
            <div>
              <Label>{copy.platformLabelField}</Label>
              <Input value={platformAdminLabel} onChange={(event) => setPlatformAdminLabel(event.target.value)} placeholder="BossFit Owners" />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm dark:bg-white/[0.04]">
            <input type="checkbox" checked={platformAdminActive} onChange={(event) => setPlatformAdminActive(event.target.checked)} />
            <span>{copy.fullPlatformAccess}</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.created}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.createdAt, locale)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.lastAccess}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.lastSignInAt, locale)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.emailConfirmed}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.emailConfirmedAt, locale)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">{copy.type}</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{detail.isManagedAccount ? copy.managedType : copy.naturalType}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleSaveProfile()} disabled={savingProfile}>{savingProfile ? copy.saving : copy.saveProfile}</Button>
          </div>
        </Card>

        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>{copy.addToGym}</CardTitle>
            <CardDescription>{copy.addToGymDescription}</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>{copy.gym}</Label>
              <select className={selectClassName} value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
                {availableGyms.length === 0 ? <option value="">{copy.noGymsAvailable}</option> : null}
                {availableGyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
              </select>
            </div>
            <div>
              <Label>{copy.primaryRole}</Label>
              <select className={selectClassName} value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as PlatformAdminGymRole)}>
                {membershipRoles.map((role) => <option key={role} value={role}>{translateRole(role, locale)}</option>)}
              </select>
            </div>
            <div>
              <Label>{copy.status}</Label>
              <select className={selectClassName} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as PlatformAdminMembershipStatus)}>
                {membershipStatuses.map((status) => <option key={status} value={status}>{translateMembershipStatus(status, locale)}</option>)}
              </select>
            </div>
          </div>

          <RoleCheckboxGroup primaryRole={selectedRole} extraRoles={selectedExtraRoles} onChange={setSelectedExtraRoles} locale={locale} />

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleAddMembership()} disabled={addingMembership || !selectedGymId || availableGyms.length === 0}>
              {addingMembership ? copy.linking : copy.addToGymAction}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.gymPermissions}</CardTitle>
          <CardDescription>{copy.gymPermissionsDescription}</CardDescription>
        </div>

        {detail.memberships.length === 0 ? (
          <AdminDataState title={copy.noMembershipTitle} description={copy.noMembershipDescription} />
        ) : (
          <div className="space-y-4">
            {detail.memberships.map((membership) => {
              const draft = membershipDrafts[membership.gymId] ?? toMembershipDraft(membership);
              return (
                <div key={membership.membershipId} className="space-y-4 rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-card-foreground dark:text-white">{membership.gymName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">/{membership.gymSlug}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {membership.effectiveRoles.map((role) => (
                          <Badge key={role} className="bg-surface text-card-foreground ring-1 ring-border">{translateRole(role, locale)}</Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {copy.assignment}: {translateAssignmentStatus(membership.assignmentStatus, locale)}
                        {membership.trainerName ? ` Â· ${locale === "en" ? "trainer" : "trainer"} ${membership.trainerName}` : ""}
                        {membership.groupName ? ` Â· ${locale === "en" ? "group" : "grupo"} ${membership.groupName}` : ""}
                      </p>
                    </div>
                    <Badge className="bg-surface text-card-foreground ring-1 ring-border">{translateMembershipStatus(membership.status, locale)}</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>{copy.primaryRole}</Label>
                      <select
                        className={selectClassName}
                        value={draft.role}
                        onChange={(event) => {
                          const nextRole = event.target.value as PlatformAdminGymRole;
                          setMembershipDrafts((current) => ({
                            ...current,
                            [membership.gymId]: {
                              ...draft,
                              role: nextRole,
                              extraRoles: normalizeExtraRoles(nextRole, draft.extraRoles)
                            }
                          }));
                        }}
                      >
                        {membershipRoles.map((role) => <option key={role} value={role}>{translateRole(role, locale)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>{copy.status}</Label>
                      <select
                        className={selectClassName}
                        value={draft.status}
                        onChange={(event) => setMembershipDrafts((current) => ({ ...current, [membership.gymId]: { ...draft, status: event.target.value as PlatformAdminMembershipStatus } }))}
                      >
                        {membershipStatuses.map((status) => <option key={status} value={status}>{translateMembershipStatus(status, locale)}</option>)}
                      </select>
                    </div>
                  </div>

                  <RoleCheckboxGroup
                    primaryRole={draft.role}
                    extraRoles={draft.extraRoles}
                    onChange={(nextRoles) =>
                      setMembershipDrafts((current) => ({
                        ...current,
                        [membership.gymId]: { ...draft, extraRoles: normalizeExtraRoles(draft.role, nextRoles) }
                      }))
                    }
                    locale={locale}
                  />

                  <div className="flex items-end gap-3">
                    <Button onClick={() => void handleSaveMembership(membership.gymId)} disabled={membershipSavingId === membership.gymId}>
                      {membershipSavingId === membership.gymId ? copy.saving : copy.saveMembership}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

