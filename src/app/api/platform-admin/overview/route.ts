import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { fetchPlatformOverview, requirePlatformAdminFromRequest } from "@/lib/supabase/platform-admin-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const access = await requirePlatformAdminFromRequest(request);

    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const overview = await fetchPlatformOverview(access.supabase);
    return NextResponse.json({ overview });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
