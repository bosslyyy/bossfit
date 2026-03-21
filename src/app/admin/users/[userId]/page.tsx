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

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

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

function RoleCheckboxGroup({
  primaryRole,
  extraRoles,
  onChange
}: {
  primaryRole: PlatformAdminGymRole;
  extraRoles: PlatformAdminGymRole[];
  onChange: (nextRoles: PlatformAdminGymRole[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Roles adicionales</Label>
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
              <span className="capitalize">{role}</span>
              {disabled ? <span className="text-xs text-muted-foreground">principal</span> : null}
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
        setError("No encontramos esa cuenta.");
        return;
      }

      hydrateDetail(nextDetail);
      setGyms(nextGyms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha técnica.");
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
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la ficha técnica.");
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
      setError(membershipError instanceof Error ? membershipError.message : "No se pudo vincular el usuario al gym.");
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
      setError(membershipError instanceof Error ? membershipError.message : "No se pudo actualizar la membership.");
    } finally {
      setMembershipSavingId(null);
    }
  };

  if (loading) {
    return <AdminDataState title="Cargando ficha técnica" description="Estamos reuniendo identidad, permisos y memberships del usuario." />;
  }

  if (error && !detail) {
    return <AdminDataState title="No pudimos cargar la ficha" description={error} actionLabel="Reintentar" onAction={() => void loadDetail()} tone="warning" />;
  }

  if (!detail) {
    return <AdminDataState title="No encontramos esa cuenta" description="Puede que ya no exista o que no haya sincronizado su perfil." tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.name}
        description="Ficha técnica global para identidad, permisos de plataforma y memberships por gym."
        action={<Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>Volver a usuarios</Link>}
      />

      {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4 text-accent" /> Cuenta</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.technicalState.level}</p>
          <p className="text-sm text-muted-foreground">nivel actual</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4 text-accent" /> Gyms</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.memberships.length}</p>
          <p className="text-sm text-muted-foreground">memberships vinculadas</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" /> Hábitos</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.technicalState.habitsCount}</p>
          <p className="text-sm text-muted-foreground">completions: {detail.technicalState.completionsCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" /> Sync</div>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">r{detail.technicalState.revision}</p>
          <p className="text-sm text-muted-foreground">{formatDate(detail.technicalState.updatedAt)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Identidad y permisos globales</CardTitle>
            <CardDescription>ID: {detail.userId}</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Email</Label>
              <Input value={detail.email} disabled />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="usuario" />
            </div>
            <div>
              <Label>Nombre completo</Label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre real" />
            </div>
            <div>
              <Label>Etiqueta platform</Label>
              <Input value={platformAdminLabel} onChange={(event) => setPlatformAdminLabel(event.target.value)} placeholder="BossFit Owners" />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm dark:bg-white/[0.04]">
            <input type="checkbox" checked={platformAdminActive} onChange={(event) => setPlatformAdminActive(event.target.checked)} />
            <span>Dar permisos de plataforma completos (/admin)</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Creada</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.createdAt)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Último acceso</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.lastSignInAt)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Email confirmado</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.emailConfirmedAt)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Tipo</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{detail.isManagedAccount ? "Gestionada" : "Natural"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleSaveProfile()} disabled={savingProfile}>{savingProfile ? "Guardando..." : "Guardar ficha"}</Button>
          </div>
        </Card>

        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Agregar a un gym</CardTitle>
            <CardDescription>Convierte una cuenta natural o gestionada en miembro, trainer, admin u owner de un gym existente.</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Gym</Label>
              <select className={selectClassName} value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
                {availableGyms.length === 0 ? <option value="">Sin gyms disponibles</option> : null}
                {availableGyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Rol principal</Label>
              <select className={selectClassName} value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as PlatformAdminGymRole)}>
                {membershipRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select className={selectClassName} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as PlatformAdminMembershipStatus)}>
                {membershipStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <RoleCheckboxGroup primaryRole={selectedRole} extraRoles={selectedExtraRoles} onChange={setSelectedExtraRoles} />

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleAddMembership()} disabled={addingMembership || !selectedGymId || availableGyms.length === 0}>
              {addingMembership ? "Vinculando..." : "Agregar al gym"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Permisos por gym</CardTitle>
          <CardDescription>Gestiona rol principal, roles adicionales y estado sin tocar la identidad global de la cuenta.</CardDescription>
        </div>

        {detail.memberships.length === 0 ? (
          <AdminDataState title="Esta cuenta no pertenece a ningún gym" description="Usa el formulario superior para vincularla a su primera operación." />
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
                          <Badge key={role} className="bg-surface text-card-foreground ring-1 ring-border">{role}</Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Asignación: {membership.assignmentStatus || "Sin asignación"}
                        {membership.trainerName ? ` · trainer ${membership.trainerName}` : ""}
                        {membership.groupName ? ` · grupo ${membership.groupName}` : ""}
                      </p>
                    </div>
                    <Badge className="bg-surface text-card-foreground ring-1 ring-border">{membership.status}</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Rol principal</Label>
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
                        {membershipRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <select
                        className={selectClassName}
                        value={draft.status}
                        onChange={(event) => setMembershipDrafts((current) => ({ ...current, [membership.gymId]: { ...draft, status: event.target.value as PlatformAdminMembershipStatus } }))}
                      >
                        {membershipStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
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
                  />

                  <div className="flex items-end gap-3">
                    <Button onClick={() => void handleSaveMembership(membership.gymId)} disabled={membershipSavingId === membership.gymId}>
                      {membershipSavingId === membership.gymId ? "Guardando..." : "Guardar membership"}
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
