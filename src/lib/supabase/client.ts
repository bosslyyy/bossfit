import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_AUTH_STORAGE_KEY = "bossfit-auth";

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

let browserClient: SupabaseClient | null = null;

function createBrowserStorageAdapter() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    getItem: (key: string) => window.localStorage.getItem(key),
    setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
    removeItem: (key: string) => window.localStorage.removeItem(key)
  };
}

export function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        storage: createBrowserStorageAdapter()
      }
    });
  }

  return browserClient;
}

export function getSupabaseStatusLabel() {
  return isSupabaseConfigured()
    ? "Supabase conectado y listo para autenticar y sincronizar BossFit."
    : "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.";
}
