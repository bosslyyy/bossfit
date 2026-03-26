"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  BellRing,
  BriefcaseBusiness,
  Globe2,
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
import { APP_VERSION } from "@/lib/constants";
import { getIntlLocale, LOCALE_OPTIONS } from "@/lib/i18n";
import { getReminderPermissionLabel, getReminderSupport, requestReminderPermission } from "@/lib/reminders";
import { fetchActiveCoachGymContext } from "@/lib/supabase/coach";
import { getSupabaseStatusLabel } from "@/lib/supabase/client";
import {
  resetAppDataAction,
  setLocaleAction,
  setThemeAction,
  updateReminderSettingsAction
} from "@/lib/supabase/user-state-actions";
import { useBossFitStore } from "@/store/use-bossfit-store";

function formatSyncDate(value: string | undefined, locale: "es" | "en") {
  if (!value) {
    return locale === "en"
      ? "There is no recent activity on this device yet."
      : "Aún no hay actividad reciente en este dispositivo.";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function SettingsPage() {
  const { theme, locale, reminderSettings, cloudSync, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      theme: state.theme,
      locale: state.locale,
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
  const [changingLocale, setChangingLocale] = useState(false);

  const copy = locale === "en"
    ? {
        loading: "Opening settings...",
        headerTitle: "Settings",
        headerDescription: "Manage your account, appearance, language, and reminders.",
        accountTitle: "Account",
        accountDescription: "Manage your access and review your current account status.",
        activeSession: "Active session",
        noEmail: "No email available",
        lastUpdate: "Last update",
        ready: "Ready",
        pending: "Pending",
        signOut: "Sign out",
        signingOut: "Signing out...",
        securityTitle: "Security",
        securityDescription:
          "Change your password from your current session. If you do not remember it, use recovery from the login screen.",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        minChars: "Minimum 6 characters",
        repeatPassword: "Repeat your new password",
        needSession: "You need an active session to change your password.",
        fillPasswords: "Fill in both password fields.",
        shortPassword: "The new password must have at least 6 characters.",
        mismatch: "Passwords do not match.",
        passwordUpdated: "Your password was updated successfully.",
        passwordUpdateError: "Could not update the password.",
        changePassword: "Change password",
        changingPassword: "Updating...",
        coachTitle: "Coach panel",
        coachDescription:
          "Your account has coach access. From here you can review assigned members and manage their training.",
        openPanel: "Open panel",
        themeTitle: "Theme",
        themeDescription: "Switch between light and dark mode.",
        localeTitle: "Language",
        localeDescription: "Choose whether BossFit should display content in Spanish or English.",
        localeUpdating: "Updating...",
        remindersTitle: "Reminders",
        remindersDescription:
          "Schedule a daily time so BossFit can remind you about your habits from the browser or PWA.",
        remindersStatus: "Status",
        dailyTime: "Daily time",
        requestPermission: "Request permission",
        rearmReminder: "Reset reminder",
        remindersNote:
          "Reminders depend on the browser and device system. On iPhone they can vary depending on whether the app is open or installed.",
        accountIncludes: "Your account includes",
        accountIncludesDescription: "These are some personal elements you will find when you sign in.",
        accountItems: ["Habits and scheduled days", "Completed sets by day", "Streaks, points, and level", "Theme, language, and reminders"],
        tipsTitle: "Get more out of it",
        tipsDescription: "Three simple tweaks to make BossFit feel more useful and consistent.",
        tips: [
          {
            title: "Install it on your home screen",
            description: "It feels faster, more immersive, and closer to a real app."
          },
          {
            title: "Use one reminder time",
            description: "Repeating the same schedule helps create consistency without overthinking it."
          },
          {
            title: "Start with a few habits",
            description: "Two or three well-completed habits sustain a streak better than a huge list."
          }
        ],
        resetTitle: "Reset data",
        resetDescription: "Reset your current routine and progress. This action requires confirmation.",
        resetButton: "Reset app",
        resetConfirm: "Reset BossFit to the initial state?"
      }
    : {
        loading: "Abriendo ajustes...",
        headerTitle: "Ajustes",
        headerDescription: "Gestiona tu cuenta, la apariencia, el idioma y los recordatorios.",
        accountTitle: "Cuenta",
        accountDescription: "Gestiona tu acceso y revisa el estado actual de tu cuenta.",
        activeSession: "Sesión activa",
        noEmail: "Sin email disponible",
        lastUpdate: "Última actualización",
        ready: "Lista",
        pending: "Pendiente",
        signOut: "Cerrar sesión",
        signingOut: "Cerrando sesión...",
        securityTitle: "Seguridad",
        securityDescription:
          "Cambia tu contraseña desde tu sesión actual. Si no recuerdas la anterior, usa la recuperación desde la pantalla de login.",
        newPassword: "Nueva contraseña",
        confirmPassword: "Confirmar contraseña",
        minChars: "Mínimo 6 caracteres",
        repeatPassword: "Repite tu nueva contraseña",
        needSession: "Necesitas una sesión activa para cambiar tu contraseña.",
        fillPasswords: "Completa los dos campos de contraseña.",
        shortPassword: "La nueva contraseña debe tener al menos 6 caracteres.",
        mismatch: "Las contraseñas no coinciden.",
        passwordUpdated: "Tu contraseña fue actualizada correctamente.",
        passwordUpdateError: "No se pudo actualizar la contraseña.",
        changePassword: "Cambiar contraseña",
        changingPassword: "Actualizando...",
        coachTitle: "Panel coach",
        coachDescription:
          "Tu cuenta tiene acceso como entrenador. Desde aquí puedes revisar alumnos asignados y gestionar sus entrenamientos.",
        openPanel: "Abrir panel",
        themeTitle: "Tema",
        themeDescription: "Activa el modo oscuro para una experiencia más intensa.",
        localeTitle: "Idioma",
        localeDescription: "Elige si BossFit debe mostrarse en español o inglés.",
        localeUpdating: "Actualizando...",
        remindersTitle: "Recordatorios",
        remindersDescription:
          "Programa una hora diaria para que BossFit te recuerde tus ejercicios desde el navegador o la PWA.",
        remindersStatus: "Estado",
        dailyTime: "Hora diaria",
        requestPermission: "Solicitar permiso",
        rearmReminder: "Rearmar recordatorio",
        remindersNote:
          "Los recordatorios dependen del navegador y del sistema de tu dispositivo. En iPhone pueden variar según si la app está abierta o instalada.",
        accountIncludes: "Tu cuenta incluye",
        accountIncludesDescription: "Estos son algunos elementos personales que encontrarás al entrar a tu cuenta.",
        accountItems: ["Ejercicios y días programados", "Series completadas por día", "Rachas, puntos y nivel", "Tema, idioma y recordatorios"],
        tipsTitle: "Sácale más provecho",
        tipsDescription: "Tres ajustes simples para que BossFit se sienta más útil y constante en tu rutina.",
        tips: [
          {
            title: "Instálala en tu pantalla de inicio",
            description: "Se siente más rápida, más inmersiva y más parecida a una app real."
          },
          {
            title: "Usa una sola hora de recordatorio",
            description: "Repetir el mismo horario facilita crear constancia sin pensar demasiado."
          },
          {
            title: "Empieza con pocos ejercicios",
            description: "Dos o tres ejercicios bien cumplidos sostienen mejor la racha que una lista enorme."
          }
        ],
        resetTitle: "Reiniciar datos",
        resetDescription: "Restablece tu rutina y tus avances actuales. Esta acción requiere confirmación.",
        resetButton: "Reiniciar app",
        resetConfirm: "¿Restablecer BossFit al estado inicial?"
      };

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport(locale);
    if (support.permission !== reminderSettings.permission) {
      void updateReminderSettingsAction({ permission: support.permission });
    }
  }, [hasHydrated, locale, reminderSettings.permission]);

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

  const reminderSupport = useMemo(() => getReminderSupport(locale), [locale]);

  if (!hasHydrated) {
    return <LoadingScreen title={copy.loading} />;
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
        window.alert(result.error);
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!supabase || !user) {
      setPasswordError(copy.needSession);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError(copy.fillPasswords);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(copy.shortPassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(copy.mismatch);
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
      setPasswordMessage(copy.passwordUpdated);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : copy.passwordUpdateError);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLocaleChange = async (nextLocale: "es" | "en") => {
    if (nextLocale === locale || changingLocale) {
      return;
    }

    setChangingLocale(true);
    try {
      await setLocaleAction(nextLocale);
    } finally {
      setChangingLocale(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader title={copy.headerTitle} description={copy.headerDescription} />

      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>{copy.accountTitle}</CardTitle>
              <CardDescription>{copy.accountDescription}</CardDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">{copy.activeSession}</p>
              <p className="mt-2 break-all font-display text-xl font-semibold text-card-foreground">
                {user?.email ?? copy.noEmail}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{getSupabaseStatusLabel(locale)}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">{copy.lastUpdate}</p>
              <p className="mt-2 font-display text-xl font-semibold text-card-foreground">
                {cloudSync.lastSyncedAt ? copy.ready : copy.pending}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatSyncDate(cloudSync.lastSyncedAt, locale)}</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? copy.signingOut : copy.signOut}
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
              <CardTitle>{copy.securityTitle}</CardTitle>
              <CardDescription>{copy.securityDescription}</CardDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="text-sm font-semibold text-card-foreground">
                {copy.newPassword}
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="mt-2"
                placeholder={copy.minChars}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="text-sm font-semibold text-card-foreground">
                {copy.confirmPassword}
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="mt-2"
                placeholder={copy.repeatPassword}
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
              {changingPassword ? copy.changingPassword : copy.changePassword}
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
                <CardTitle>{copy.coachTitle}</CardTitle>
                <CardDescription>{copy.coachDescription}</CardDescription>
              </div>
            </div>
            <Link href="/coach" className={buttonVariants({ variant: "primary" })}>
              {copy.openPanel}
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{copy.themeTitle}</CardTitle>
            <CardDescription>{copy.themeDescription}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <SunMedium className="h-4 w-4 text-muted-foreground" />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-4"
              onClick={() => {
                void setThemeAction(theme === "dark" ? "light" : "dark");
              }}
            >
              {theme === "dark" ? (locale === "en" ? "Dark" : "Oscuro") : (locale === "en" ? "Light" : "Claro")}
            </Button>
            <MoonStar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>{copy.localeTitle}</CardTitle>
              <CardDescription>{copy.localeDescription}</CardDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LOCALE_OPTIONS.map((option) => {
              const selected = locale === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void handleLocaleChange(option.value);
                  }}
                  disabled={changingLocale}
                  className={[
                    "rounded-[24px] border px-4 py-4 text-left transition",
                    selected
                      ? "border-accent bg-accent/12 text-accent ring-1 ring-accent/20"
                      : "border-border bg-surface text-card-foreground hover:bg-muted"
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.value === "es" ? "Español" : "English"}</p>
                </button>
              );
            })}
          </div>

          {changingLocale ? <p className="text-sm text-muted-foreground">{copy.localeUpdating}</p> : null}
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
                <CardTitle>{copy.remindersTitle}</CardTitle>
                <CardDescription>{copy.remindersDescription}</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant={reminderSettings.enabled ? "primary" : "outline"}
              onClick={() => {
                void handleReminderToggle(!reminderSettings.enabled);
              }}
            >
              {reminderSettings.enabled ? (locale === "en" ? "On" : "Activos") : (locale === "en" ? "Off" : "Desactivados")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-card-foreground">{copy.remindersStatus}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-card-foreground">
                {getReminderPermissionLabel(reminderSettings.permission, locale)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{reminderSupport.platformHint}</p>
            </div>

            <div className="rounded-[24px] border border-border bg-surface p-4">
              <label htmlFor="reminder-time" className="text-sm font-semibold text-card-foreground">
                {copy.dailyTime}
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
                  {copy.requestPermission}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void updateReminderSettingsAction({ lastSentDate: undefined });
                  }}
                  disabled={!reminderSettings.enabled}
                >
                  {copy.rearmReminder}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {copy.remindersNote}
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
              <CardTitle>{copy.accountIncludes}</CardTitle>
              <CardDescription>{copy.accountIncludesDescription}</CardDescription>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.accountItems.map((item) => (
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
              <CardTitle>{copy.tipsTitle}</CardTitle>
              <CardDescription>{copy.tipsDescription}</CardDescription>
            </div>
          </div>
          <div className="space-y-3 rounded-[22px] border border-border bg-background p-4">
            {copy.tips.map((tip) => (
              <div key={tip.title}>
                <p className="text-sm font-semibold text-card-foreground">{tip.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <CardTitle>{copy.resetTitle}</CardTitle>
            <CardDescription>{copy.resetDescription}</CardDescription>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              const confirmed = window.confirm(copy.resetConfirm);
              if (confirmed) {
                void resetAppDataAction();
              }
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {copy.resetButton}
          </Button>
        </div>
      </Card>
    </div>
  );
}


