"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { fetchActiveAdminGymContext, type AdminGymContext } from "@/lib/supabase/admin";

interface AdminContextValue {
  context: AdminGymContext;
  refreshContext: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminAccessGate({ children }: PropsWithChildren) {
  const { user, status } = useSupabaseAuth();
  const [context, setContext] = useState<AdminGymContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const nextContext = await fetchActiveAdminGymContext(userId);
      setContext(nextContext);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudo abrir el panel del gym.";
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
    return <LoadingScreen title="Abriendo panel del gym..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Gym</p>
            <CardTitle>No pudimos cargar tu acceso al panel</CardTitle>
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Gym</p>
            <CardTitle>Tu cuenta no tiene acceso al panel del gym</CardTitle>
            <CardDescription>
              Necesitas un membership activo con rol owner o admin dentro de un gimnasio para entrar aquí.
            </CardDescription>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Volver a BossFit
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
    throw new Error("useAdminContext debe usarse dentro de AdminAccessGate.");
  }

  return context;
}


