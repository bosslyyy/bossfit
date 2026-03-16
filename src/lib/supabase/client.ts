export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

export function getSupabaseStatusLabel() {
  return isSupabaseConfigured()
    ? "Supabase listo para integrarse."
    : "Supabase pendiente de configurar.";
}
