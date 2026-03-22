"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAppLocale } from "@/hooks/use-app-locale";
import { fetchActiveAdminGymContext, type AdminGymContext } from "@/lib/supabase/admin";

interface AdminContextValue {
  context: AdminGymContext;
  refreshContext: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminAccessGate({ children }: PropsWithChildren) {
  const { user, status } = useSupabaseAuth();
  const locale = useAppLocale();
  const [context, setContext] = useState<AdminGymContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          fallbackError: "Could not open the gym panel.",
          loading: "Opening gym panel...",
          loadTitle: "We could not load your panel access",
          noAccessTitle: "Your account does not have gym panel access",
          noAccessDescription: "You need an active membership with owner or admin role inside a gym to enter here.",
          back: "Back to BossFit"
        }
      : {
          fallbackError: "No se pudo abrir el panel del gym.",
          loading: "Abriendo panel del gym...",
          loadTitle: "No pudimos cargar tu acceso al panel",
          noAccessTitle: "Tu cuenta no tiene acceso al panel del gym",
          noAccessDescription: "Necesitas un membership activo con rol owner o admin dentro de un gimnasio para entrar aquí.",
          back: "Volver a BossFit"
        };

  const loadContext = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchActiveAdminGymContext(userId);
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

  const value = useMemo<AdminContextValue | null>(() => {
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Gym</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Gym</p>
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

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error("useAdminContext must be used inside AdminAccessGate.");
  }

  return context;
}
