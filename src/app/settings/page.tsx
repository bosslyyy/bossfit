"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  BellRing,
  BriefcaseBusiness,
  KeyRound,
  LogOut,
  MoonStar,
  RotateCcw,
  ShieldCheck,
  SunMedium
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { InstallHint } from "@/components/pwa/install-hint";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { APP_VERSION } from "@/lib/constants";
import { getReminderPermissionLabel, getReminderSupport, requestReminderPermission } from "@/lib/reminders";
import { fetchActiveCoachGymContext } from "@/lib/supabase/coach";
import { getSupabaseStatusLabel } from "@/lib/supabase/client";
import { resetAppDataAction, setThemeAction, updateReminderSettingsAction } from "@/lib/supabase/user-state-actions";
import { useBossFitStore } from "@/store/use-bossfit-store";

function formatSyncDate(value?: string) {
  if (!value) {
    return "Aún no hay actividad reciente en este dispositivo.";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function SettingsPage() {
  const { theme, reminderSettings, cloudSync, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      theme: state.theme,
      reminderSettings: state.reminderSettings,
      cloudSync: state.cloudSync,
      hasHydrated: state.hasHydrated
    }))
  );
  const { user, signOut, supabase } = useSupabaseAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [hasCoachAccess, setHasCoachAccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (support.permission !== reminderSettings.permission) {
      void updateReminderSettingsAction({ permission: support.permission });
    }
  }, [hasHydrated, reminderSettings.permission]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setHasCoachAccess(false);
      return;
    }

    const loadCoachAccess = async () => {
      try {
        const context = await fetchActiveCoachGymContext(user.id);
        if (!cancelled) {
          setHasCoachAccess(Boolean(context));
        }
      } catch {
        if (!cancelled) {
          setHasCoachAccess(false);
        }
      }
    };

    void loadCoachAccess();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const reminderSupport = useMemo(() => getReminderSupport(), []);

  if (!hasHydrated) {
    return <LoadingScreen title="Abriendo ajustes..." />;
  }

  const handleReminderToggle = async (checked: boolean) => {
    if (!checked) {
      await updateReminderSettingsAction({ enabled: false });
      return;
    }

    if (!reminderSupport.supported) {
      await updateReminderSettingsAction({ enabled: false, permission: "unsupported" });
      return;
    }

    let nextPermission = reminderSupport.permission;

    if (nextPermission !== "granted") {
      nextPermission = await requestReminderPermission();
      await updateReminderSettingsAction({ permission: nextPermission });
    }

    await updateReminderSettingsAction({
      enabled: nextPermission === "granted"
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const result = await signOut();
      if (result.error) {
        window.alert(`No se pudo cerrar sesión: ${result.error}`);
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!supabase || !user) {
      setPasswordError("Necesitas una sesión activa para cambiar tu contraseña.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("Completa los dos campos de contraseña.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Tu contraseña fue actualizada correctamente.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Ajustes"
        description="Gestiona tu cuenta, la apariencia y los recordatorios de BossFit."
      />

      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Cuenta</CardTitle>
              <CardDescription>
                Gestiona tu acceso y revisa el estado actual de tu cuenta.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">Sesión activa</p>
              <p className="mt-2 break-all font-display text-xl font-semibold text-card-foreground">
                {user?.email ?? "Sin email disponible"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{getSupabaseStatusLabel()}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">Última actualización</p>
              <p className="mt-2 font-display text-xl font-semibold text-card-foreground">
                {cloudSync.lastSyncedAt ? "Lista" : "Pendiente"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatSyncDate(cloudSync.lastSyncedAt)}</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>
                Cambia tu contraseña desde tu sesión actual. Si no recuerdas la anterior, usa la recuperación desde la pantalla de login.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="text-sm font-semibold text-card-foreground">
                Nueva contraseña
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="mt-2"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="text-sm font-semibold text-card-foreground">
                Confirmar contraseña
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="mt-2"
                placeholder="Repite tu nueva contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>

          {passwordError ? (
            <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {passwordError}
            </div>
          ) : null}

          {passwordMessage ? (
            <div className="rounded-[20px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-card-foreground">
              {passwordMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleChangePassword} disabled={changingPassword || !user}>
              <KeyRound className="mr-2 h-4 w-4" />
              {changingPassword ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
          </div>
        </div>
      </Card>

      {hasCoachAccess ? (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>Panel coach</CardTitle>
                <CardDescription>
                  Tu cuenta tiene acceso como entrenador. Desde aquí puedes revisar alumnos asignados y gestionar sus entrenamientos.
                </CardDescription>
              </div>
            </div>
            <Link href="/coach" className={buttonVariants({ variant: "primary" })}>
              Abrir panel
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Tema</CardTitle>
            <CardDescription>Activa el modo oscuro para una experiencia más intensa.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <SunMedium className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => {
                void setThemeAction(checked ? "dark" : "light");
              }}
              ariaLabel="Cambiar tema"
            />
            <MoonStar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>Recordatorios</CardTitle>
                <CardDescription>
                  Programa una hora diaria para que BossFit te recuerde tus hábitos desde el navegador o la PWA.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={reminderSettings.enabled}
              onCheckedChange={handleReminderToggle}
              ariaLabel="Activar recordatorios"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">Estado</p>
              <p className="mt-2 font-display text-2xl font-semibold text-card-foreground">
                {getReminderPermissionLabel(reminderSettings.permission)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{reminderSupport.platformHint}</p>
            </div>

            <div className="rounded-[24px] border border-border bg-surface p-4">
              <label htmlFor="reminder-time" className="text-sm font-semibold text-card-foreground">
                Hora diaria
              </label>
              <Input
                id="reminder-time"
                type="time"
                className="mt-3"
                value={reminderSettings.time}
                onChange={(event) => {
                  void updateReminderSettingsAction({ time: event.target.value });
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const permission = await requestReminderPermission();
                    void updateReminderSettingsAction({
                      permission,
                      enabled: permission === "granted" ? reminderSettings.enabled : false
                    });
                  }}
                  disabled={!reminderSupport.supported}
                >
                  Solicitar permiso
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void updateReminderSettingsAction({ lastSentDate: undefined });
                  }}
                  disabled={!reminderSettings.enabled}
                >
                  Rearmar recordatorio
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Los recordatorios dependen del navegador y del sistema de tu dispositivo. En iPhone pueden variar según si la app está abierta o instalada.
          </div>
        </div>
      </Card>

      <InstallHint />

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Tu cuenta incluye</CardTitle>
              <CardDescription>
                Estos son algunos elementos personales que encontrarás al entrar a tu cuenta.
              </CardDescription>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Hábitos y días programados", "Series completadas por día", "Rachas, puntos y nivel", "Tema y recordatorios"].map((item) => (
              <div key={item} className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm font-medium text-card-foreground">
                {item}
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{APP_VERSION}</p>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Sácale más provecho</CardTitle>
              <CardDescription>
                Tres ajustes simples para que BossFit se sienta más útil y constante en tu rutina.
              </CardDescription>
            </div>
          </div>
          <div className="space-y-3 rounded-[22px] border border-border bg-background p-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Instálala en tu pantalla de inicio</p>
              <p className="mt-1 text-sm text-muted-foreground">Se siente más rápida, más inmersiva y más parecida a una app real.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">Usa una sola hora de recordatorio</p>
              <p className="mt-1 text-sm text-muted-foreground">Repetir el mismo horario facilita crear constancia sin pensar demasiado.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">Empieza con pocos hábitos</p>
              <p className="mt-1 text-sm text-muted-foreground">Dos o tres hábitos bien cumplidos sostienen mejor la racha que una lista enorme.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <CardTitle>Reiniciar datos</CardTitle>
            <CardDescription>Restablece tu rutina y tus avances actuales. Esta acción requiere confirmación.</CardDescription>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              const confirmed = window.confirm("¿Restablecer BossFit al estado inicial?");
              if (confirmed) {
                void resetAppDataAction();
              }
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar app
          </Button>
        </div>
      </Card>
    </div>
  );
}
