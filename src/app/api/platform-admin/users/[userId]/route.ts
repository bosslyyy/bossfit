import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { fetchPlatformUserDetail, requirePlatformAdminFromRequest, updatePlatformUser } from "@/lib/supabase/platform-admin-server";
import { platformAdminUpdateUserSchema } from "@/lib/validation/platform-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await requirePlatformAdminFromRequest(request);
    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const { userId } = await context.params;
    const user = await fetchPlatformUserDetail(access.supabase, userId);
    if (!user) {
      return NextResponse.json({ error: "No encontramos esa cuenta." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const access = await requirePlatformAdminFromRequest(request);
    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const parsed = platformAdminUpdateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { userId } = await context.params;
    const user = await updatePlatformUser(access.supabase, userId, parsed.data);
    return NextResponse.json({ user });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
