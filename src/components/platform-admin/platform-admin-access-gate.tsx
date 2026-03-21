"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { fetchPlatformAdminContext } from "@/lib/supabase/platform-admin";
import type { PlatformAdminContext } from "@/types/platform-admin";

interface PlatformAdminContextValue {
  context: PlatformAdminContext;
  refreshContext: () => Promise<void>;
}

const PlatformAdminContextStore = createContext<PlatformAdminContextValue | null>(null);

export function PlatformAdminAccessGate({ children }: PropsWithChildren) {
  const { user, session, status } = useSupabaseAuth();
  const [context, setContext] = useState<PlatformAdminContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async (accessToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchPlatformAdminContext(accessToken);
      setContext(nextContext);
    } catch (loadError) {
      setContext(null);
      setError(loadError instanceof Error ? loadError.message : "No se pudo abrir el panel de plataforma.");
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
    return <LoadingScreen title="Abriendo panel de plataforma..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Platform</p>
            <CardTitle>No pudimos cargar tu acceso de plataforma</CardTitle>
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Platform</p>
            <CardTitle>Tu cuenta no tiene acceso al panel de plataforma</CardTitle>
            <CardDescription>
              Este espacio está reservado para la operación global de BossFit: gyms, usuarios y control central.
            </CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Volver a BossFit
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
    throw new Error("usePlatformAdminContext debe usarse dentro de PlatformAdminAccessGate.");
  }

  return context;
}
