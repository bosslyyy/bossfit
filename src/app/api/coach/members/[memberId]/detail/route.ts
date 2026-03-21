import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { buildCoachMemberDetail, getCoachMemberAccessContext } from "@/lib/supabase/coach-server";
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

function parseMonthAnchor(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return new Date();
  }

  return new Date(year, monthIndex, 1, 12, 0, 0, 0);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const { memberId } = await context.params;
    const monthAnchor = parseMonthAnchor(new URL(request.url).searchParams.get("month"));
    const supabase = createSupabaseServiceRoleClient();
    const access = await getCoachMemberAccessContext(supabase, requester.id, memberId);

    if (!access) {
      return NextResponse.json({ error: "No puedes abrir la ficha de este alumno." }, { status: 403, headers: noStoreHeaders });
    }

    const detail = await buildCoachMemberDetail(supabase, access, monthAnchor);
    return NextResponse.json(detail, { headers: noStoreHeaders });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json(
      {
        error: info.message,
        details: info.details,
        hint: info.hint,
        code: info.code
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

