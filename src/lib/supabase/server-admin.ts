import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/client";

function assertSupabaseServerEnv() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan variables de entorno de Supabase para operaciones administrativas.");
  }
}

export function createSupabaseServiceRoleClient() {
  assertSupabaseServerEnv();

  return createClient(supabaseConfig.url, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  assertSupabaseServerEnv();

  const authorization = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    return null;
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    throw error;
  }

  return data.user ?? null;
}
