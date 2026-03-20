import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

const updateAssignmentSchema = z.object({
  trainerUserId: z.string().uuid().optional().or(z.literal("")),
  groupId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "pending", "paused"])
});

interface RouteContext {
  params: Promise<{
    assignmentId: string;
  }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { assignmentId } = await context.params;
    const parsed = updateAssignmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: assignment, error: assignmentError } = await supabase
      .from("member_assignments")
      .select("id, gym_id, member_user_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignmentError) {
      throw assignmentError;
    }

    if (!assignment) {
      return NextResponse.json({ error: "No encontramos esa asignación." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("gym_memberships")
      .select("id")
      .eq("gym_id", assignment.gym_id)
      .eq("user_id", requester.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return NextResponse.json({ error: "No tienes permisos para editar esta asignación." }, { status: 403 });
    }

    const { trainerUserId, groupId, status } = parsed.data;

    if (trainerUserId) {
      const { data: trainerMembership, error: trainerMembershipError } = await supabase
        .from("gym_memberships")
        .select("id")
        .eq("gym_id", assignment.gym_id)
        .eq("user_id", trainerUserId)
        .eq("role", "trainer")
        .eq("status", "active")
        .maybeSingle();

      if (trainerMembershipError) {
        throw trainerMembershipError;
      }

      if (!trainerMembership) {
        return NextResponse.json({ error: "El entrenador seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    let validatedGroupId: string | null = null;
    if (groupId) {
      const { data: group, error: groupError } = await supabase
        .from("gym_groups")
        .select("id")
        .eq("gym_id", assignment.gym_id)
        .eq("id", groupId)
        .maybeSingle();

      if (groupError) {
        throw groupError;
      }

      if (!group) {
        return NextResponse.json({ error: "El grupo seleccionado no pertenece a este gym." }, { status: 400 });
      }

      validatedGroupId = group.id;
    }

    const { error: updateError } = await supabase
      .from("member_assignments")
      .update({
        trainer_user_id: trainerUserId || null,
        group_id: validatedGroupId,
        status
      })
      .eq("id", assignmentId);

    if (updateError) {
      throw updateError;
    }

    const { data: gymGroups, error: gymGroupsError } = await supabase
      .from("gym_groups")
      .select("id")
      .eq("gym_id", assignment.gym_id);

    if (gymGroupsError) {
      throw gymGroupsError;
    }

    const gymGroupIds = (gymGroups ?? []).map((group) => group.id);
    if (gymGroupIds.length) {
      const { error: cleanupError } = await supabase
        .from("group_memberships")
        .delete()
        .eq("user_id", assignment.member_user_id)
        .in("group_id", gymGroupIds);

      if (cleanupError) {
        throw cleanupError;
      }
    }

    if (validatedGroupId) {
      const { error: insertGroupMembershipError } = await supabase.from("group_memberships").insert({
        group_id: validatedGroupId,
        user_id: assignment.member_user_id,
        assigned_by: requester.id
      });

      if (insertGroupMembershipError) {
        throw insertGroupMembershipError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Admin: no se pudo actualizar la asignación.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
