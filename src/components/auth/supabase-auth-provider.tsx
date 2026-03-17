"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getSupabaseErrorInfo,
  hasMeaningfulSnapshotData,
  logSupabaseError,
  saveRemoteState,
  toRemoteSnapshot
} from "@/lib/supabase/data";
import { useBossFitStore } from "@/store/use-bossfit-store";

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

function hasUnsyncedLocalChanges(lastLocalChangeAt?: string, lastSyncedAt?: string) {
  if (!lastLocalChangeAt) {
    return false;
  }

  if (!lastSyncedAt) {
    return true;
  }

  return new Date(lastLocalChangeAt).getTime() > new Date(lastSyncedAt).getTime();
}

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

        const currentUserId = session?.user?.id;

        if (currentUserId) {
          const state = useBossFitStore.getState();
          const sameOwner = state.cloudSync.userId === currentUserId;
          const snapshot = toRemoteSnapshot({
            habits: state.habits,
            completions: state.completions,
            theme: state.theme,
            reminderSettings: state.reminderSettings
          });
          const shouldFlushBeforeLogout =
            sameOwner &&
            hasMeaningfulSnapshotData(snapshot) &&
            hasUnsyncedLocalChanges(state.cloudSync.lastLocalChangeAt, state.cloudSync.lastSyncedAt);

          if (shouldFlushBeforeLogout) {
            try {
              const saved = await saveRemoteState(currentUserId, snapshot);
              state.setCloudSyncState({
                userId: currentUserId,
                lastSyncedAt: saved.lastSyncedAt,
                lastLocalChangeAt: saved.lastSyncedAt
              });
            } catch (error) {
              logSupabaseError("BossFit: no se pudo sincronizar antes de cerrar sesion.", error);
              return {
                error: getSupabaseErrorInfo(error).message
              };
            }
          }
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
