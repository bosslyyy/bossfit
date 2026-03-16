"use client";

import { Cloud, DatabaseZap, MoonStar, RotateCcw, SunMedium } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { InstallHint } from "@/components/pwa/install-hint";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { getSupabaseStatusLabel } from "@/lib/supabase/client";
import { useBossFitStore } from "@/store/use-bossfit-store";

export default function SettingsPage() {
  const { theme, hasHydrated, setTheme, resetAppData } = useBossFitStore(
    useShallow((state) => ({
      theme: state.theme,
      hasHydrated: state.hasHydrated,
      setTheme: state.setTheme,
      resetAppData: state.resetAppData
    }))
  );

  if (!hasHydrated) {
    return <LoadingScreen title="Abriendo ajustes..." />;
  }

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
            <SunMedium className="h-4 w-4 text-foreground/50" />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              ariaLabel="Cambiar tema"
            />
            <MoonStar className="h-4 w-4 text-foreground/50" />
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
              <CardDescription>Tus hábitos se guardan en el dispositivo y sobreviven al recargar.</CardDescription>
            </div>
          </div>
          <div className="rounded-[22px] bg-black/5 p-4 text-sm text-foreground/70 dark:bg-white/5">
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
