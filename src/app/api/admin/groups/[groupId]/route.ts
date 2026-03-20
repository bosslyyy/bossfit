import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import {
  ensureTrainerBelongsToGym,
  getAdminGroupDetail,
  requireAdminGymAccess,
  stripGroupFromAssignments
} from "@/lib/supabase/admin-route-helpers";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { adminUpdateGroupSchema } from "@/lib/validation/admin-management";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

function getGymIdFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("gymId");
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const gymId = getGymIdFromRequest(request);
    if (!gymId) {
      return NextResponse.json({ error: "Falta gymId." }, { status: 400 });
    }

    const { groupId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para abrir este grupo." }, { status: 403 });
    }

    const detail = await getAdminGroupDetail(supabase, gymId, groupId);
    if (!detail) {
      return NextResponse.json({ error: "No encontramos ese grupo dentro de este gym." }, { status: 404 });
    }

    return NextResponse.json({ detail });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { groupId } = await context.params;
    const parsed = adminUpdateGroupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { gymId, name, description, trainerUserId, scheduleText, active } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para editar este grupo." }, { status: 403 });
    }

    const detail = await getAdminGroupDetail(supabase, gymId, groupId);
    if (!detail) {
      return NextResponse.json({ error: "No encontramos ese grupo dentro de este gym." }, { status: 404 });
    }

    if (trainerUserId) {
      const trainerMembership = await ensureTrainerBelongsToGym(supabase, gymId, trainerUserId);
      if (!trainerMembership) {
        return NextResponse.json({ error: "El entrenador seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    const { error: updateError } = await supabase
      .from("gym_groups")
      .update({
        name,
        description: description || null,
        trainer_user_id: trainerUserId || null,
        schedule_text: scheduleText || null,
        active
      })
      .eq("id", groupId)
      .eq("gym_id", gymId);

    if (updateError) {
      throw updateError;
    }

    const nextDetail = await getAdminGroupDetail(supabase, gymId, groupId);
    return NextResponse.json({ detail: nextDetail });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const gymId = getGymIdFromRequest(request);
    if (!gymId) {
      return NextResponse.json({ error: "Falta gymId." }, { status: 400 });
    }

    const { groupId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para eliminar este grupo." }, { status: 403 });
    }

    const detail = await getAdminGroupDetail(supabase, gymId, groupId);
    if (!detail) {
      return NextResponse.json({ error: "No encontramos ese grupo dentro de este gym." }, { status: 404 });
    }

    await stripGroupFromAssignments(supabase, gymId, groupId);

    const { error: membershipsError } = await supabase
      .from("group_memberships")
      .delete()
      .eq("group_id", groupId);

    if (membershipsError) {
      throw membershipsError;
    }

    const { error: deleteError } = await supabase
      .from("gym_groups")
      .delete()
      .eq("id", groupId)
      .eq("gym_id", gymId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
