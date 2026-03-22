"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchActiveCoachGymContext, type CoachGymContext } from "@/lib/supabase/coach";

interface CoachContextValue {
  context: CoachGymContext;
  refreshContext: () => Promise<void>;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachAccessGate({ children }: PropsWithChildren) {
  const { user, status } = useSupabaseAuth();
  const locale = useAppLocale();
  const [context, setContext] = useState<CoachGymContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          fallbackError: "Could not open the coach panel.",
          loading: "Opening coach panel...",
          loadTitle: "We could not load your access",
          noAccessTitle: "Your account does not have coach access",
          noAccessDescription: "You need an active trainer membership and assigned members to use this panel.",
          back: "Back to BossFit"
        }
      : {
          fallbackError: "No se pudo abrir el panel coach.",
          loading: "Abriendo panel del entrenador...",
          loadTitle: "No pudimos cargar tu acceso",
          noAccessTitle: "Tu cuenta no tiene acceso como entrenador",
          noAccessDescription: "Necesitas un membership activo con rol trainer y alumnos asignados para usar este panel.",
          back: "Volver a BossFit"
        };

  const loadContext = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchActiveCoachGymContext(userId);
      setContext(nextContext);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : copy.fallbackError;
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
    return <LoadingScreen title={copy.loading} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Coach</p>
            <CardTitle>{copy.loadTitle}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            {copy.back}
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
            <CardTitle>{copy.noAccessTitle}</CardTitle>
            <CardDescription>{copy.noAccessDescription}</CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            {copy.back}
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
    throw new Error("useCoachContext must be used inside CoachAccessGate.");
  }

  return context;
}
