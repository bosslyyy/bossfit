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
import { attachExistingUserToPlatformGym, fetchPlatformAdminGymDetail, updatePlatformAdminGym } from "@/lib/supabase/platform-admin";
import type { PlatformAdminGymDetail, PlatformAdminGymRole, PlatformAdminMembershipStatus } from "@/types/platform-admin";

const membershipRoles: PlatformAdminGymRole[] = ["owner", "admin", "trainer", "member"];
const membershipStatuses: PlatformAdminMembershipStatus[] = ["active", "invited", "paused", "suspended"];
const selectClassName =
  "h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function normalizeExtraRoles(primaryRole: PlatformAdminGymRole, extraRoles: PlatformAdminGymRole[] = []) {
  return [...new Set(extraRoles.filter((role) => role !== primaryRole))];
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

export default function PlatformAdminGymDetailPage() {
  const params = useParams<{ gymId: string }>();
  const gymId = typeof params?.gymId === "string" ? params.gymId : "";
  const { session } = useSupabaseAuth();
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
        setError("No encontramos ese gym.");
        return;
      }

      setDetail(nextDetail);
      setName(nextDetail.name);
      setSlug(nextDetail.slug);
      setContactEmail(nextDetail.contactEmail);
      setPhone(nextDetail.phone);
      setActive(nextDetail.active);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha del gym.");
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
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el gym.");
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
      setError(linkError instanceof Error ? linkError.message : "No se pudo vincular el usuario al gym.");
    } finally {
      setLinking(false);
    }
  };

  const owners = useMemo(
    () => detail?.memberships.filter((membership) => membership.effectiveRoles.includes("owner")) ?? [],
    [detail?.memberships]
  );

  if (loading) {
    return <AdminDataState title="Cargando gym" description="Estamos reuniendo memberships, owners y estructura operativa." />;
  }

  if (error && !detail) {
    return (
      <AdminDataState
        title="No pudimos cargar el gym"
        description={error}
        actionLabel="Reintentar"
        onAction={() => void loadDetail()}
        tone="warning"
      />
    );
  }

  if (!detail) {
    return <AdminDataState title="No encontramos ese gym" description="Puede que ya no exista o que no tengas acceso de plataforma." tone="warning" />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={detail.name}
        description="Ficha global del gym para identidad, estado operativo y memberships activas."
        action={
          <Link href="/admin/gyms" className={buttonVariants({ variant: "outline" })}>
            Volver a gyms
          </Link>
        }
      />

      {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Owners</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.ownersCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.adminsCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Trainers</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.trainersCount}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{detail.membersCount}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Configuración del gym</CardTitle>
            <CardDescription>ID: {detail.id}</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </div>
            <div>
              <Label>Email de contacto</Label>
              <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@gym.com" />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 ..." />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[20px] border border-border bg-background/80 px-4 py-3 text-sm dark:bg-white/[0.04]">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            <span>Gym activo</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Creado</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{formatDate(detail.createdAt)}</p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Memberships</p>
              <p className="mt-2 font-semibold text-card-foreground dark:text-white">{detail.totalMemberships}</p>
            </div>
          </div>

          {owners.length ? (
            <div className="rounded-[22px] border border-border bg-background/80 p-4 text-sm dark:bg-white/[0.04]">
              <p className="text-muted-foreground">Owners efectivos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {owners.map((membership) => (
                  <Badge key={membership.membershipId} className="bg-surface text-card-foreground ring-1 ring-border">
                    {membership.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <Button onClick={() => void handleSaveGym()} disabled={saving}>{saving ? "Guardando..." : "Guardar gym"}</Button>
        </Card>

        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-1">
            <CardTitle>Vincular usuario existente</CardTitle>
            <CardDescription>Agrega una cuenta natural o gestionada por email o username sin crear duplicados.</CardDescription>
          </div>

          <div>
            <Label>Usuario o email</Label>
            <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="email o username" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Rol principal</Label>
              <select className={selectClassName} value={role} onChange={(event) => setRole(event.target.value as PlatformAdminGymRole)}>
                {membershipRoles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as PlatformAdminMembershipStatus)}>
                {membershipStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <RoleCheckboxGroup primaryRole={role} extraRoles={extraRoles} onChange={setExtraRoles} />

          <Button onClick={() => void handleLinkUser()} disabled={linking || !identifier.trim()}>
            {linking ? "Vinculando..." : "Agregar al gym"}
          </Button>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Usuarios vinculados</CardTitle>
          <CardDescription>Control central de owners, admins, trainers y members dentro de este gym.</CardDescription>
        </div>

        <div className="space-y-4">
          {detail.memberships.map((membership) => (
            <div key={membership.membershipId} className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-card-foreground dark:text-white">{membership.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{membership.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Usuario: {membership.username || "Sin username"}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{membership.role}</Badge>
                  <Badge className="bg-surface text-card-foreground ring-1 ring-border">{membership.status}</Badge>
                  {membership.isManagedAccount ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">Gestionada</Badge> : null}
                  {membership.isPlatformAdmin ? <Badge className="bg-accent/12 text-accent ring-1 ring-accent/20">Platform</Badge> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {membership.effectiveRoles.map((membershipRole) => (
                  <Badge key={`${membership.membershipId}-${membershipRole}`} className="bg-surface text-card-foreground ring-1 ring-border">
                    {membershipRole}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/admin/users/${membership.userId}`} className={buttonVariants({ variant: "outline" })}>
                  Abrir ficha tecnica
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
