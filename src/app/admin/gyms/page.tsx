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
import { useAppLocale } from "@/hooks/use-app-locale";
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
  const locale = useAppLocale();
  const [gyms, setGyms] = useState<PlatformAdminGymListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerIdentifier, setOwnerIdentifier] = useState("");

  const copy =
    locale === "en"
      ? {
          loadError: "Could not load gyms.",
          createError: "Could not create the gym.",
          title: "Gyms",
          description: "Create gyms, assign owners, and open the operational profile for each location.",
          totalGyms: "Total gyms",
          active: "Active",
          totalMembers: "Total members",
          createTitle: "Create gym",
          createDescription: "Create a new gym and optionally assign an existing owner by email or username.",
          name: "Name",
          namePlaceholder: "Ex. BossFit Escazu",
          slug: "Slug",
          initialOwner: "Initial owner",
          initialOwnerPlaceholder: "email or username",
          contactEmail: "Contact email",
          phone: "Phone",
          creating: "Creating gym...",
          create: "Create gym",
          loadingTitle: "Loading gyms",
          loadingDescription: "Consulting the full gym network.",
          emptyTitle: "No gyms yet",
          emptyDescription: "Create the first one above to start the platform operation.",
          inactive: "Inactive",
          owners: "Owners",
          noOwner: "No owner",
          activeMemberships: "Active memberships",
          staff: "Staff",
          linkedMembers: "Members",
          openGym: "Open gym profile"
        }
      : {
          loadError: "No se pudieron cargar los gyms.",
          createError: "No se pudo crear el gym.",
          title: "Gyms",
          description: "Crea gyms, asigna owners y abre la ficha operativa de cada instalación.",
          totalGyms: "Gyms totales",
          active: "Activos",
          totalMembers: "Miembros totales",
          createTitle: "Crear gym",
          createDescription: "Crea un gym nuevo y, si quieres, asígnale un owner existente por email o username.",
          name: "Nombre",
          namePlaceholder: "Ej. BossFit Escaz�",
          slug: "Slug",
          initialOwner: "Owner inicial",
          initialOwnerPlaceholder: "email o username",
          contactEmail: "Email de contacto",
          phone: "Teléfono",
          creating: "Creando gym...",
          create: "Crear gym",
          loadingTitle: "Cargando gyms",
          loadingDescription: "Estamos consultando la red de gyms completa.",
          emptyTitle: "Aún no hay gyms",
          emptyDescription: "Crea el primero arriba para iniciar la operación de plataforma.",
          inactive: "Inactivo",
          owners: "Owners",
          noOwner: "Sin owner",
          activeMemberships: "Membresías activas",
          staff: "Staff",
          linkedMembers: "Miembros",
          openGym: "Abrir ficha del gym"
        };

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
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
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
      setError(createError instanceof Error ? createError.message : copy.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader title={copy.title} description={copy.description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.totalGyms}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{gyms.length}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.active}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{stats.active}</p>
        </Card>
        <Card className="space-y-3 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <p className="text-sm text-muted-foreground">{copy.totalMembers}</p>
          <p className="font-display text-3xl font-semibold text-card-foreground dark:text-white">{stats.members}</p>
        </Card>
      </div>

      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-1">
          <CardTitle>{copy.createTitle}</CardTitle>
          <CardDescription>{copy.createDescription}</CardDescription>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="gym-name">{copy.name}</Label>
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
              placeholder={copy.namePlaceholder}
            />
          </div>
          <div>
            <Label htmlFor="gym-slug">{copy.slug}</Label>
            <Input id="gym-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="bossfit-escazu" />
          </div>
          <div>
            <Label htmlFor="gym-owner">{copy.initialOwner}</Label>
            <Input id="gym-owner" value={ownerIdentifier} onChange={(event) => setOwnerIdentifier(event.target.value)} placeholder={copy.initialOwnerPlaceholder} />
          </div>
          <div>
            <Label htmlFor="gym-contact-email">{copy.contactEmail}</Label>
            <Input id="gym-contact-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@gym.com" />
          </div>
          <div>
            <Label htmlFor="gym-phone">{copy.phone}</Label>
            <Input id="gym-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 ..." />
          </div>
        </div>

        {error ? <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleCreateGym()} disabled={submitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {submitting ? copy.creating : copy.create}
          </Button>
        </div>
      </Card>

      {loading ? <AdminDataState title={copy.loadingTitle} description={copy.loadingDescription} /> : null}
      {!loading && !error && gyms.length === 0 ? <AdminDataState title={copy.emptyTitle} description={copy.emptyDescription} /> : null}

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
                  {gym.active ? copy.active : copy.inactive}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">{copy.owners}</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.ownerNames.length ? gym.ownerNames.join(", ") : copy.noOwner}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">{copy.activeMemberships}</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.totalMemberships}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">{copy.staff}</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.adminsCount} admins · {gym.trainersCount} trainers</p>
                </div>
                <div className="rounded-[22px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-sm text-muted-foreground">{copy.linkedMembers}</p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-white">{gym.membersCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/gyms/${gym.id}`} className={buttonVariants({ variant: "outline" })}>
                  {copy.openGym}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
