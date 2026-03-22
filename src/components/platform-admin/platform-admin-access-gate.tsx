"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchPlatformAdminContext } from "@/lib/supabase/platform-admin";
import type { PlatformAdminContext } from "@/types/platform-admin";

interface PlatformAdminContextValue {
  context: PlatformAdminContext;
  refreshContext: () => Promise<void>;
}

const PlatformAdminContextStore = createContext<PlatformAdminContextValue | null>(null);

export function PlatformAdminAccessGate({ children }: PropsWithChildren) {
  const { user, session, status } = useSupabaseAuth();
  const locale = useAppLocale();
  const [context, setContext] = useState<PlatformAdminContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          fallbackError: "Could not open the platform panel.",
          loading: "Opening platform panel...",
          loadTitle: "We could not load your platform access",
          noAccessTitle: "Your account does not have platform panel access",
          noAccessDescription: "This area is reserved for BossFit global operations: gyms, users, and central control.",
          back: "Back to BossFit"
        }
      : {
          fallbackError: "No se pudo abrir el panel de plataforma.",
          loading: "Abriendo panel de plataforma...",
          loadTitle: "No pudimos cargar tu acceso de plataforma",
          noAccessTitle: "Tu cuenta no tiene acceso al panel de plataforma",
          noAccessDescription: "Este espacio est� reservado para la operación global de BossFit: gyms, usuarios y control central.",
          back: "Volver a BossFit"
        };

  const loadContext = async (accessToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchPlatformAdminContext(accessToken);
      setContext(nextContext);
    } catch (loadError) {
      setContext(null);
      setError(loadError instanceof Error ? loadError.message : copy.fallbackError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !user?.id || !session?.access_token) {
      setContext(null);
      setLoading(status === "loading");
      setError(null);
      return;
    }

    void loadContext(session.access_token);
  }, [session?.access_token, status, user?.id]);

  const value = useMemo<PlatformAdminContextValue | null>(() => {
    if (!context || !session?.access_token) {
      return null;
    }

    return {
      context,
      refreshContext: async () => {
        await loadContext(session.access_token);
      }
    };
  }, [context, session?.access_token]);

  if (status === "loading" || loading) {
    return <LoadingScreen title={copy.loading} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Platform</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Platform</p>
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

  return <PlatformAdminContextStore.Provider value={value}>{children}</PlatformAdminContextStore.Provider>;
}

export function usePlatformAdminContext() {
  const context = useContext(PlatformAdminContextStore);

  if (!context) {
    throw new Error("usePlatformAdminContext must be used inside PlatformAdminAccessGate.");
  }

  return context;
}
