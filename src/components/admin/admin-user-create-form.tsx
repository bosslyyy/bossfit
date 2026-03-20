"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Copy, KeyRound, Mail, ShieldPlus, Sparkles, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";

import { useAdminContext } from "@/components/admin/admin-access-gate";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { fetchAdminGroups, fetchAdminTrainers, type AdminGroupListItem, type AdminTrainerListItem } from "@/lib/supabase/admin";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/lib/validation/admin-user";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-transparent focus:bg-card focus:ring-2 focus:ring-ring";

interface CreatedUserResult {
  id: string;
  alias: string;
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "trainer" | "member";
  gymName: string;
}

const roleLabels: Record<CreatedUserResult["role"], string> = {
  admin: "Admin",
  trainer: "Entrenador",
  member: "Miembro"
};

export function AdminUserCreateForm() {
  const { context } = useAdminContext();
  const { session } = useSupabaseAuth();
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [groups, setGroups] = useState<AdminGroupListItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUserResult | null>(null);
  const [copiedField, setCopiedField] = useState<"alias" | "email" | "password" | null>(null);

  const form = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      gymId: context.gymId,
      fullName: "",
      role: "member"
    },
    mode: "onChange"
  });

  const role = form.watch("role");
  const isMember = role === "member";

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [nextTrainers, nextGroups] = await Promise.all([
        fetchAdminTrainers(context.gymId),
        fetchAdminGroups(context.gymId)
      ]);
      setTrainers(nextTrainers);
      setGroups(nextGroups.filter((group) => group.active));
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudieron cargar los datos del formulario.");
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    form.setValue("gymId", context.gymId, { shouldDirty: false, shouldValidate: false });
    void loadOptions();
  }, [context.gymId]);

  useEffect(() => {
    if (!isMember) {
      form.setValue("trainerUserId", undefined, { shouldDirty: true, shouldValidate: true });
      form.setValue("groupId", undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, isMember]);

  const handleCopy = async (value: string, field: "alias" | "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!session?.access_token) {
      setServerError("No encontramos una sesión válida para crear el usuario.");
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setCreatedUser(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...values,
          gymId: context.gymId,
          trainerUserId: values.trainerUserId || undefined,
          groupId: values.groupId || undefined
        })
      });

      const payload = (await response.json()) as { error?: string; user?: CreatedUserResult };

      if (!response.ok || !payload.user) {
        setServerError(payload.error ?? "No se pudo crear el usuario.");
        return;
      }

      setCreatedUser(payload.user);
      form.reset({
        gymId: context.gymId,
        fullName: "",
        role: "member"
      });
      void loadOptions();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setSubmitting(false);
    }
  });

  if (loadingOptions) {
    return <AdminDataState title="Preparando formulario" description="Estamos cargando entrenadores y grupos activos del gym." />;
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <ShieldPlus className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Crear usuario del gym</CardTitle>
            <CardDescription>
              BossFit generará un acceso corto y una contraseña temporal. Si el rol es miembro, puedes dejarlo asignado desde ahora.
            </CardDescription>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input id="full-name" placeholder="Ej. Valeria Rojas" {...form.register("fullName")} />
              {form.formState.errors.fullName ? <p className="mt-2 text-sm text-danger">{form.formState.errors.fullName.message}</p> : null}
            </div>

            <div>
              <Label htmlFor="role">Rol</Label>
              <select id="role" className={selectClassName} {...form.register("role")}>
                <option value="member">Miembro</option>
                <option value="trainer">Entrenador</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <Label htmlFor="gym-name">Gym</Label>
              <Input id="gym-name" value={context.gymName} readOnly />
            </div>
          </div>

          {isMember ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="trainer-user-id">Entrenador</Label>
                <select id="trainer-user-id" className={selectClassName} {...form.register("trainerUserId")}>
                  <option value="">Sin asignar aún</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.userId} value={trainer.userId}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="group-id">Grupo</Label>
                <select id="group-id" className={selectClassName} {...form.register("groupId")}>
                  <option value="">Sin grupo aún</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-border bg-background/80 p-4 text-sm text-muted-foreground dark:bg-white/[0.04]">
              Los roles admin y entrenador se crean ya vinculados al gym. Luego podrás asignar bloques, grupos o permisos más finos desde el panel.
            </div>
          )}

          {serverError ? (
            <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{serverError}</div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando usuario..." : "Crear usuario"}
            </Button>
            <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
              Volver a usuarios
            </Link>
          </div>
        </form>
      </Card>

      {createdUser ? (
        <Card className="space-y-5 border border-border bg-card dark:bg-[#121922] dark:text-white">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Usuario listo</CardTitle>
              <CardDescription>
                Estas credenciales temporales ya pueden entrar a BossFit y quedaron vinculadas a {createdUser.gymName}.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">Nombre</p>
              <p className="mt-2 text-sm text-muted-foreground">{createdUser.fullName}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold text-card-foreground dark:text-white">Rol</p>
              <p className="mt-2 text-sm text-muted-foreground">{roleLabels[createdUser.role]}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Usuario</p>
                <button type="button" onClick={() => void handleCopy(createdUser.alias, "alias")} className="text-sm font-semibold text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                <span>{createdUser.alias}</span>
              </div>
              {copiedField === "alias" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Acceso completo</p>
                <button type="button" onClick={() => void handleCopy(createdUser.email, "email")} className="text-sm font-semibold text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="break-all">{createdUser.email}</span>
              </div>
              {copiedField === "email" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 p-4 dark:bg-white/[0.04] sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-card-foreground dark:text-white">Contraseña temporal</p>
                <button type="button" onClick={() => void handleCopy(createdUser.password, "password")} className="text-sm font-semibold text-accent">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                <span>{createdUser.password}</span>
              </div>
              {copiedField === "password" ? <p className="mt-2 text-xs text-accent">Copiado</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreatedUser(null)}>
              Crear otro
            </Button>
            <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
              Ver usuarios
            </Link>
            <Link href="/admin/assignments" className={buttonVariants({ variant: "ghost" })}>
              Revisar asignaciones
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
