import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { fetchPlatformGymDetail, requirePlatformAdminFromRequest, updatePlatformGym } from "@/lib/supabase/platform-admin-server";
import { platformAdminUpdateGymSchema } from "@/lib/validation/platform-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    gymId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await requirePlatformAdminFromRequest(request);
    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const { gymId } = await context.params;
    const gym = await fetchPlatformGymDetail(access.supabase, gymId);
    if (!gym) {
      return NextResponse.json({ error: "No encontramos ese gym." }, { status: 404 });
    }

    return NextResponse.json({ gym });
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

    const parsed = platformAdminUpdateGymSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { gymId } = await context.params;
    const gym = await updatePlatformGym(access.supabase, gymId, parsed.data);
    return NextResponse.json({ gym });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
