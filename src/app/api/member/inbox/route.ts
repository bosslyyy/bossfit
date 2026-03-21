import { NextResponse } from "next/server";
import { z } from "zod";

import { buildMemberInboxData, markMemberInboxItemsRead } from "@/lib/supabase/coach-server";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

const inboxPatchSchema = z.object({
  action: z.enum(["mark_read", "dismiss_alert"]),
  alertId: z.string().uuid().optional()
});

export async function GET(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();
    const inbox = await buildMemberInboxData(supabase, requester.id);
    return NextResponse.json(inbox, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const parsed = inboxPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();

    if (parsed.data.action === "mark_read") {
      await markMemberInboxItemsRead(supabase, requester.id);
    }

    if (parsed.data.action === "dismiss_alert") {
      if (!parsed.data.alertId) {
        return NextResponse.json({ error: "Falta alertId." }, { status: 400, headers: noStoreHeaders });
      }

      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from("bossfit_member_alerts")
        .update({ read_at: timestamp, dismissed_at: timestamp })
        .eq("id", parsed.data.alertId)
        .eq("member_user_id", requester.id)
        .is("archived_at", null);

      if (error) throw error;
    }

    const inbox = await buildMemberInboxData(supabase, requester.id);
    return NextResponse.json(inbox, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500, headers: noStoreHeaders });
  }
}

