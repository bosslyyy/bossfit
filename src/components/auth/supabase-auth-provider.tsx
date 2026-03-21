"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SupabaseAuthContextValue {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isConfigured: boolean;
  signOut: () => Promise<{ error: string | null }>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const isConfigured = isSupabaseConfigured();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isConfigured ? "loading" : "unauthenticated");

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setSession(null);
      setStatus("unauthenticated");
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setSession(data.session ?? null);
      setStatus(data.session?.user ? "authenticated" : "unauthenticated");
    };

    void loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setStatus(nextSession?.user ? "authenticated" : "unauthenticated");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase]);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      status,
      isConfigured,
      signOut: async () => {
        if (!supabase) {
          return { error: "Supabase no esta configurado." };
        }

        const { error } = await supabase.auth.signOut();
        return { error: error?.message ?? null };
      }
    }),
    [isConfigured, session, status, supabase]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);

  if (!context) {
    throw new Error("useSupabaseAuth debe usarse dentro de SupabaseAuthProvider.");
  }

  return context;
}
