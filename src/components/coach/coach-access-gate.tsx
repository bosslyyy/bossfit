"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { fetchActiveCoachGymContext, type CoachGymContext } from "@/lib/supabase/coach";

interface CoachContextValue {
  context: CoachGymContext;
  refreshContext: () => Promise<void>;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachAccessGate({ children }: PropsWithChildren) {
  const { user, status } = useSupabaseAuth();
  const [context, setContext] = useState<CoachGymContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchActiveCoachGymContext(userId);
      setContext(nextContext);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudo abrir el panel coach.";
      setError(message);
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) {
      setContext(null);
      setLoading(status === "loading");
      setError(null);
      return;
    }

    void loadContext(user.id);
  }, [status, user?.id]);

  const value = useMemo<CoachContextValue | null>(() => {
    if (!context) {
      return null;
    }

    return {
      context,
      refreshContext: async () => {
        await loadContext(context.userId);
      }
    };
  }, [context]);

  if (status === "loading" || loading) {
    return <LoadingScreen title="Abriendo panel del entrenador..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Coach</p>
            <CardTitle>No pudimos cargar tu acceso</CardTitle>
            <CardDescription>{error}</CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Volver a BossFit
          </Link>
        </Card>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Coach</p>
            <CardTitle>Tu cuenta no tiene acceso como entrenador</CardTitle>
            <CardDescription>
              Necesitas un membership activo con rol trainer y alumnos asignados para usar este panel.
            </CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Volver a BossFit
          </Link>
        </Card>
      </div>
    );
  }

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoachContext() {
  const context = useContext(CoachContext);

  if (!context) {
    throw new Error("useCoachContext debe usarse dentro de CoachAccessGate.");
  }

  return context;
}
