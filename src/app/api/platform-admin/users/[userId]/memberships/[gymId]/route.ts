import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { requirePlatformAdminFromRequest, updatePlatformUserMembership } from "@/lib/supabase/platform-admin-server";
import { platformAdminUpdateMembershipSchema } from "@/lib/validation/platform-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    userId: string;
    gymId: string;
  }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const access = await requirePlatformAdminFromRequest(request);
    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const parsed = platformAdminUpdateMembershipSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { userId, gymId } = await context.params;
    const user = await updatePlatformUserMembership(access.supabase, access.requester.id, userId, gymId, parsed.data);
    return NextResponse.json({ user });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
