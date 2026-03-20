import { NextResponse } from "next/server";

import { DEFAULT_REMINDER_SETTINGS } from "@/lib/persistence";
import {
  getSupabaseErrorInfo,
  toRemoteSnapshot,
  type BossFitRemoteSnapshot,
  type SaveRemoteStateOptions
} from "@/lib/supabase/data";
import {
  createSupabaseServiceRoleClient,
  getAuthenticatedUserFromRequest
} from "@/lib/supabase/server-admin";
import {
  fetchUserRemoteStateWithClient,
  saveUserRemoteStateWithClient
} from "@/lib/supabase/user-state-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

export async function GET(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();
    const state = await fetchUserRemoteStateWithClient(supabase, requester.id);

    return NextResponse.json({ state }, { headers: noStoreHeaders });
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

export async function POST(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const body = (await request.json()) as {
      snapshot?: Partial<BossFitRemoteSnapshot>;
      reason?: SaveRemoteStateOptions["reason"];
    };

    if (!body.snapshot) {
      return NextResponse.json({ error: "Falta el snapshot del usuario." }, { status: 400, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();
    const saved = await saveUserRemoteStateWithClient(
      supabase,
      requester.id,
      toRemoteSnapshot({
        habits: body.snapshot.habits ?? [],
        completions: body.snapshot.completions ?? [],
        theme: body.snapshot.theme ?? "light",
        reminderSettings: {
          ...DEFAULT_REMINDER_SETTINGS,
          ...(body.snapshot.reminderSettings ?? {})
        }
      }),
      { reason: body.reason }
    );

    return NextResponse.json({ saved }, { headers: noStoreHeaders });
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
