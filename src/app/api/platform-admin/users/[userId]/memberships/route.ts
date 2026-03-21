import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { addMembershipToPlatformUser, requirePlatformAdminFromRequest } from "@/lib/supabase/platform-admin-server";
import { platformAdminAddMembershipSchema } from "@/lib/validation/platform-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const access = await requirePlatformAdminFromRequest(request);
    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const parsed = platformAdminAddMembershipSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { userId } = await context.params;
    const user = await addMembershipToPlatformUser(access.supabase, access.requester.id, userId, parsed.data);
    return NextResponse.json({ user });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
