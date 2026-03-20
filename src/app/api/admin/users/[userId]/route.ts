import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import {
  cleanupMemberDataForUser,
  cleanupTrainerLinksForUser,
  ensureGroupBelongsToGym,
  ensureTrainerBelongsToGym,
  getAdminUserDetail,
  isManagedBossFitEmail,
  replaceUserGroupMembership,
  requireAdminGymAccess,
  upsertMemberAssignment
} from "@/lib/supabase/admin-route-helpers";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { adminUpdateUserSchema } from "@/lib/validation/admin-management";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    userId: string;
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

    const { userId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para abrir esta ficha." }, { status: 403 });
    }

    const detail = await getAdminUserDetail(supabase, gymId, userId);
    if (!detail) {
      return NextResponse.json({ error: "No encontramos ese usuario dentro de este gym." }, { status: 404 });
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

    const { userId } = await context.params;
    const parsed = adminUpdateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { gymId, fullName, username, role, status, trainerUserId, groupId, assignmentStatus } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para editar este usuario." }, { status: 403 });
    }

    const currentDetail = await getAdminUserDetail(supabase, gymId, userId);
    if (!currentDetail) {
      return NextResponse.json({ error: "No encontramos ese usuario dentro de este gym." }, { status: 404 });
    }

    if (currentDetail.role === "owner") {
      return NextResponse.json({ error: "Los owners no se editan desde este panel todavía." }, { status: 400 });
    }

    if (requester.id === userId && (role !== currentDetail.role || status !== currentDetail.status)) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol o estado desde esta vista." }, { status: 400 });
    }

    if (trainerUserId) {
      const trainerMembership = await ensureTrainerBelongsToGym(supabase, gymId, trainerUserId);
      if (!trainerMembership) {
        return NextResponse.json({ error: "El entrenador seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    if (groupId) {
      const group = await ensureGroupBelongsToGym(supabase, gymId, groupId);
      if (!group) {
        return NextResponse.json({ error: "El grupo seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    const { data: authUserResponse, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError) {
      throw authUserError;
    }

    const existingMetadata = authUserResponse.user?.user_metadata ?? {};

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email: currentDetail.email,
        full_name: fullName,
        display_name: fullName,
        username: username || null
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      throw profileError;
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMetadata,
        full_name: fullName,
        display_name: fullName
      }
    });

    if (authUpdateError) {
      throw authUpdateError;
    }

    if (currentDetail.role === "trainer" && role !== "trainer") {
      await cleanupTrainerLinksForUser(supabase, gymId, userId);
    }

    if (currentDetail.role === "member" && role !== "member") {
      await cleanupMemberDataForUser(supabase, gymId, userId);
    }

    const { error: membershipUpdateError } = await supabase
      .from("gym_memberships")
      .update({ role, status })
      .eq("id", currentDetail.membershipId);

    if (membershipUpdateError) {
      throw membershipUpdateError;
    }

    if (role === "member") {
      const nextAssignmentStatus = assignmentStatus ?? currentDetail.assignment?.status ?? ((trainerUserId || groupId) ? "active" : "pending");
      await upsertMemberAssignment(supabase, gymId, userId, trainerUserId || null, groupId || null, nextAssignmentStatus);
      await replaceUserGroupMembership(supabase, gymId, userId, groupId || null, requester.id);
    }

    const detail = await getAdminUserDetail(supabase, gymId, userId);
    return NextResponse.json({ detail });
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

    const { userId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const access = await requireAdminGymAccess(supabase, requester.id, gymId);

    if (!access) {
      return NextResponse.json({ error: "No tienes permisos para eliminar este usuario." }, { status: 403 });
    }

    const detail = await getAdminUserDetail(supabase, gymId, userId);
    if (!detail) {
      return NextResponse.json({ error: "No encontramos ese usuario dentro de este gym." }, { status: 404 });
    }

    if (detail.role === "owner") {
      return NextResponse.json({ error: "No puedes eliminar un owner desde este panel." }, { status: 400 });
    }

    if (requester.id === userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta desde el panel." }, { status: 400 });
    }

    const { count: membershipsCount, error: membershipsCountError } = await supabase
      .from("gym_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (membershipsCountError) {
      throw membershipsCountError;
    }

    if (isManagedBossFitEmail(detail.email) && (membershipsCount ?? 0) <= 1) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        throw deleteUserError;
      }

      return NextResponse.json({ success: true, deletedScope: "account" });
    }

    if (detail.role === "trainer") {
      await cleanupTrainerLinksForUser(supabase, gymId, userId);
    }

    if (detail.role === "member") {
      await cleanupMemberDataForUser(supabase, gymId, userId);
    }

    const { error: membershipDeleteError } = await supabase
      .from("gym_memberships")
      .delete()
      .eq("gym_id", gymId)
      .eq("user_id", userId);

    if (membershipDeleteError) {
      throw membershipDeleteError;
    }

    return NextResponse.json({ success: true, deletedScope: "gym" });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
