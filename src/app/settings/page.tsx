"use client";

import { useEffect } from "react";

import { BellRing, Cloud, DatabaseZap, MoonStar, RotateCcw, SunMedium } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { InstallHint } from "@/components/pwa/install-hint";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { getReminderPermissionLabel, getReminderSupport, requestReminderPermission } from "@/lib/reminders";
import { getSupabaseStatusLabel } from "@/lib/supabase/client";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function SettingsPage() {
  const { theme, reminderSettings, hasHydrated, setTheme, updateReminderSettings, resetAppData } = useBossFitStore(
    useShallow((state) => ({
      theme: state.theme,
      reminderSettings: state.reminderSettings,
      hasHydrated: state.hasHydrated,
      setTheme: state.setTheme,
      updateReminderSettings: state.updateReminderSettings,
      resetAppData: state.resetAppData
    }))
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (support.permission !== reminderSettings.permission) {
      updateReminderSettings({ permission: support.permission });
    }
  }, [hasHydrated, reminderSettings.permission, updateReminderSettings]);

  if (!hasHydrated) {
    return <LoadingScreen title="Abriendo ajustes..." />;
  }

  const reminderSupport = getReminderSupport();

  const handleReminderToggle = async (checked: boolean) => {
    if (!checked) {
      updateReminderSettings({ enabled: false });
      return;
    }

    if (!reminderSupport.supported) {
      updateReminderSettings({ enabled: false, permission: "unsupported" });
      return;
    }

    let nextPermission = reminderSupport.permission;

    if (nextPermission !== "granted") {
      nextPermission = await requestReminderPermission();
      updateReminderSettings({ permission: nextPermission });
    }

    updateReminderSettings({
      enabled: nextPermission === "granted"
    });
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Ajustes"
        description="Configura el look, revisa el estado local de la app y deja lista la futura sincronización."
      />

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
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
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
                onChange={(event) => updateReminderSettings({ time: event.target.value })}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const permission = await requestReminderPermission();
                    updateReminderSettings({
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
                  onClick={() => updateReminderSettings({ lastSentDate: undefined })}
                  disabled={!reminderSettings.enabled}
                >
                  Rearmar recordatorio
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Los recordatorios funcionan sin backend y sin push remota. En especial en iPhone/iOS no pueden quedar garantizados con la app cerrada, así que BossFit los ejecuta de forma segura mientras está abierta o instalada en un entorno compatible.
          </div>
        </div>
      </Card>

      <InstallHint />

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Persistencia local</CardTitle>
              <CardDescription>Tus hábitos, progreso y ajustes sobreviven al recargar en este dispositivo.</CardDescription>
            </div>
          </div>
          <div className="rounded-[22px] border border-border bg-background p-4 text-sm text-muted-foreground">
            La estructura ya está lista para conectar autenticación y Supabase más adelante sin rehacer el dominio.
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Sincronización futura</CardTitle>
            <CardDescription>{getSupabaseStatusLabel()}</CardDescription>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <CardTitle>Reiniciar datos</CardTitle>
            <CardDescription>Restablece hábitos y progreso al estado de ejemplo del MVP.</CardDescription>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              const confirmed = window.confirm("¿Restablecer BossFit al estado inicial?");
              if (confirmed) {
                resetAppData();
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

