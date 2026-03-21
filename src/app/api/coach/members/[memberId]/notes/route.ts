import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { fetchCoachNotesForMember, getCoachMemberAccessContext } from "@/lib/supabase/coach-server";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{
    memberId: string;
  }>;
}

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

const noteSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  noteType: z.enum(["general", "performance", "injury", "nutrition", "mindset", "followup"]).default("general"),
  pinned: z.boolean().default(false)
});

const notePatchSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(2).max(120).optional(),
  body: z.string().trim().min(2).max(2000).optional(),
  noteType: z.enum(["general", "performance", "injury", "nutrition", "mindset", "followup"]).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional()
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const { memberId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await getCoachMemberAccessContext(supabase, requester.id, memberId);
    if (!access) {
      return NextResponse.json({ error: "No puedes crear notas para este alumno." }, { status: 403, headers: noStoreHeaders });
    }

    const parsed = noteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const { error } = await supabase.from("bossfit_coach_notes").insert({
      gym_id: access.assignment.gym_id,
      member_user_id: memberId,
      coach_user_id: requester.id,
      title: parsed.data.title,
      body: parsed.data.body,
      note_type: parsed.data.noteType,
      pinned: parsed.data.pinned
    });

    if (error) throw error;

    const notes = await fetchCoachNotesForMember(supabase, memberId);
    return NextResponse.json({ notes }, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const { memberId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await getCoachMemberAccessContext(supabase, requester.id, memberId);
    if (!access) {
      return NextResponse.json({ error: "No puedes editar notas para este alumno." }, { status: 403, headers: noStoreHeaders });
    }

    const parsed = notePatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.body !== undefined) patch.body = parsed.data.body;
    if (parsed.data.noteType !== undefined) patch.note_type = parsed.data.noteType;
    if (parsed.data.pinned !== undefined) patch.pinned = parsed.data.pinned;
    if (parsed.data.archived !== undefined) patch.archived_at = parsed.data.archived ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("bossfit_coach_notes")
      .update(patch)
      .eq("id", parsed.data.noteId)
      .eq("member_user_id", memberId)
      .eq("coach_user_id", requester.id);

    if (error) throw error;

    const notes = await fetchCoachNotesForMember(supabase, memberId);
    return NextResponse.json({ notes }, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

