import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchCoachAlertsForMember, getCoachMemberAccessContext } from "@/lib/supabase/coach-server";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
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

const alertSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1200),
  severity: z.enum(["info", "warning", "success", "urgent"]).default("info"),
  expiresAt: z.string().datetime().optional().nullable()
});

const alertPatchSchema = z.object({
  alertId: z.string().uuid(),
  title: z.string().trim().min(2).max(120).optional(),
  body: z.string().trim().min(2).max(1200).optional(),
  severity: z.enum(["info", "warning", "success", "urgent"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  archived: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  markRead: z.boolean().optional()
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
      return NextResponse.json({ error: "No puedes enviar alertas a este alumno." }, { status: 403, headers: noStoreHeaders });
    }

    const parsed = alertSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const { error } = await supabase.from("bossfit_member_alerts").insert({
      gym_id: access.assignment.gym_id,
      member_user_id: memberId,
      coach_user_id: requester.id,
      title: parsed.data.title,
      body: parsed.data.body,
      severity: parsed.data.severity,
      expires_at: parsed.data.expiresAt ?? null
    });

    if (error) throw error;

    const alerts = await fetchCoachAlertsForMember(supabase, memberId);
    return NextResponse.json({ alerts }, { headers: noStoreHeaders });
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
      return NextResponse.json({ error: "No puedes editar alertas de este alumno." }, { status: 403, headers: noStoreHeaders });
    }

    const parsed = alertPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const timestamp = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.body !== undefined) patch.body = parsed.data.body;
    if (parsed.data.severity !== undefined) patch.severity = parsed.data.severity;
    if (parsed.data.expiresAt !== undefined) patch.expires_at = parsed.data.expiresAt;
    if (parsed.data.archived !== undefined) patch.archived_at = parsed.data.archived ? timestamp : null;
    if (parsed.data.dismissed !== undefined) patch.dismissed_at = parsed.data.dismissed ? timestamp : null;
    if (parsed.data.markRead) patch.read_at = timestamp;

    const { error } = await supabase
      .from("bossfit_member_alerts")
      .update(patch)
      .eq("id", parsed.data.alertId)
      .eq("member_user_id", memberId)
      .eq("coach_user_id", requester.id);

    if (error) throw error;

    const alerts = await fetchCoachAlertsForMember(supabase, memberId);
    return NextResponse.json({ alerts }, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

