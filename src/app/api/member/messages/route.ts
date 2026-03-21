import { NextResponse } from "next/server";
import { z } from "zod";

import { buildMemberInboxData, getMemberInboxContext } from "@/lib/supabase/coach-server";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

export async function POST(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const parsed = messageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();
    const context = await getMemberInboxContext(supabase, requester.id);
    if (!context || !context.assignment.trainer_user_id) {
      return NextResponse.json({ error: "No tienes un coach activo para este chat." }, { status: 403, headers: noStoreHeaders });
    }

    const { error } = await supabase.from("bossfit_member_messages").insert({
      gym_id: context.assignment.gym_id,
      member_user_id: requester.id,
      coach_user_id: context.assignment.trainer_user_id,
      sender_user_id: requester.id,
      sender_role: "member",
      body: parsed.data.body
    });

    if (error) throw error;

    const inbox = await buildMemberInboxData(supabase, requester.id);
    return NextResponse.json(inbox, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

