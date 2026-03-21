import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createPlatformManagedUser, fetchPlatformUsers, requirePlatformAdminFromRequest } from "@/lib/supabase/platform-admin-server";
import { platformAdminCreateManagedUserSchema } from "@/lib/validation/platform-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const access = await requirePlatformAdminFromRequest(request);

    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const users = await fetchPlatformUsers(access.supabase);
    return NextResponse.json({ users });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePlatformAdminFromRequest(request);

    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const parsed = platformAdminCreateManagedUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const credentials = await createPlatformManagedUser(access.supabase, parsed.data);
    return NextResponse.json({ credentials });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
