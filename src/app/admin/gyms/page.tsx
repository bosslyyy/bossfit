"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { Building2, PlusCircle } from "lucide-react";

import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlatformAdminGym, fetchPlatformAdminGyms } from "@/lib/supabase/platform-admin";
import type { PlatformAdminGymListItem } from "@/types/platform-admin";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function PlatformAdminGymsPage() {
  const { session } = useSupabaseAuth();
  const [gyms, setGyms] = useState<PlatformAdminGymListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerIdentifier, setOwnerIdentifier] = useState("");

  const stats = useMemo(
    () => ({
      active: gyms.filter((gym) => gym.active).length,
      members: gyms.reduce((total, gym) => total + gym.membersCount, 0)
    }),
    [gyms]
  );

  const loadGyms = async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextGyms = await fetchPlatformAdminGyms(session.access_token);
      setGyms(nextGyms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los gyms.");
      setGyms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGyms();
  }, [session?.access_token]);

  const handleCreateGym = async () => {
    if (!session?.access_token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createPlatformAdminGym(session.access_token, {
        name,
        slug,
        contactEmail: contactEmail || undefined,
        phone: phone || undefined,
        ownerIdentifier: ownerIdentifier || undefined,
        active: true
      });
      setName("");
      setSlug("");
      setContactEmail("");
      setPhone("");
      setOwnerIdentifier("");
      await loadGyms();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el gym.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Gyms" description="Crea gyms, asigna owners y abre la ficha operativa de cada instalación." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Gyms totales</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{gyms.length}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Activos</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{stats.active}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">Miembros totales</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{stats.members}</p>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>Crear gym</CardTitle>
          <CardDescription>Crea un gym nuevo y, si quieres, asígnale un owner existente por email o username.</CardDescription>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="gym-name">Nombre</Label>
            <Input
              id="gym-name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!slug) {
                  setSlug(slugify(nextName));
                }
              }}
              placeholder="Ej. BossFit Escazú"
            />
          </div>
          <div>
            <Label htmlFor="gym-slug">Slug</Label>
            <Input id="gym-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="bossfit-escazu" />
          </div>
          <div>
            <Label htmlFor="gym-owner">Owner inicial</Label>
            <Input id="gym-owner" value={ownerIdentifier} onChange={(event) => setOwnerIdentifier(event.target.value)} placeholder="email o username" />
          </div>
          <div>
            <Label htmlFor="gym-contact-email">Email de contacto</Label>
            <Input id="gym-contact-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@gym.com" />
          </div>
          <div>
            <Label htmlFor="gym-phone">Teléfono</Label>
            <Input id="gym-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 ..." />
          </div>
        </div>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleCreateGym()} disabled={submitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {submitting ? "Creando gym..." : "Crear gym"}
          </Button>
        </div>
      </Card>

      {loading ? <AdminDataState title="Cargando gyms" description="Estamos consultando la red de gyms completa." /> : null}
      {!loading && !error && gyms.length === 0 ? <AdminDataState title="Aún no hay gyms" description="Crea el primero arriba para iniciar la operación de plataforma." /> : null}

      {!loading && gyms.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {gyms.map((gym) => (
            <Card key={gym.id} className="space-y-4 border border-border bg-card dark:bg-[#121922] dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <p className="font-semibold text-card-foreground dark:text-white">{gym.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">/{gym.slug}</p>
                </div>
                <Badge className={gym.active ? "bg-accent/12 text-accent ring-1 ring-accent/20" : "bg-muted text-card-foreground ring-1 ring-border"}>
                  {gym.active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">Owners</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.ownerNames.length ? gym.ownerNames.join(", ") : "Sin owner"}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">Membresías activas</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.totalMemberships}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.adminsCount} admins · {gym.trainersCount} trainers</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">Miembros</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.membersCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/gyms/${gym.id}`} className={buttonVariants({ variant: "outline" })}>
                  Abrir ficha del gym
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
