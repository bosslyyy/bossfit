import { NextResponse } from "next/server";

import { ensureGroupBelongsToGym, ensureTrainerBelongsToGym, requireAdminGymAccess } from "@/lib/supabase/admin-route-helpers";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { generateManagedAccessForGym } from "@/lib/supabase/managed-credentials";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { adminCreateUserSchema } from "@/lib/validation/admin-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Datos inválidos."
        },
        { status: 400 }
      );
    }

    const { gymId, fullName, role, trainerUserId, groupId } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();

    const membership = await requireAdminGymAccess(supabase, requester.id, gymId);
    if (!membership) {
      return NextResponse.json({ error: "Tu cuenta no tiene permisos para crear usuarios en este gym." }, { status: 403 });
    }

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("id, name, slug")
      .eq("id", gymId)
      .maybeSingle();

    if (gymError) {
      throw gymError;
    }

    if (!gym) {
      return NextResponse.json({ error: "No encontramos el gym solicitado." }, { status: 404 });
    }

    if (role === "member" && trainerUserId) {
      const trainerMembership = await ensureTrainerBelongsToGym(supabase, gymId, trainerUserId);
      if (!trainerMembership) {
        return NextResponse.json({ error: "El entrenador seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    if (role === "member" && groupId) {
      const group = await ensureGroupBelongsToGym(supabase, gymId, groupId);
      if (!group) {
        return NextResponse.json({ error: "El grupo seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    const managedAccess = await generateManagedAccessForGym(supabase, fullName, gym.slug);

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: managedAccess.email,
      password: managedAccess.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
        gym_slug: gym.slug,
        login_alias: managedAccess.alias,
        username: managedAccess.alias
      }
    });

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error("No se pudo crear el usuario en Auth.");
    }

    const createdUserId = createdUser.user.id;

    try {
      const { error: profileUpsertError } = await supabase.from("profiles").upsert(
        {
          user_id: createdUserId,
          email: managedAccess.email,
          full_name: fullName,
          display_name: fullName,
          username: managedAccess.alias
        },
        { onConflict: "user_id" }
      );

      if (profileUpsertError) {
        throw profileUpsertError;
      }

      const { error: insertMembershipError } = await supabase.from("gym_memberships").insert({
        gym_id: gymId,
        user_id: createdUserId,
        role,
        status: "active",
        invited_by: requester.id
      });

      if (insertMembershipError) {
        throw insertMembershipError;
      }

      if (role === "member" && groupId) {
        const { error: insertGroupMembershipError } = await supabase.from("group_memberships").insert({
          group_id: groupId,
          user_id: createdUserId,
          assigned_by: requester.id
        });

        if (insertGroupMembershipError) {
          throw insertGroupMembershipError;
        }
      }

      if (role === "member") {
        const { error: insertAssignmentError } = await supabase.from("member_assignments").insert({
          gym_id: gymId,
          member_user_id: createdUserId,
          trainer_user_id: trainerUserId ?? null,
          group_id: groupId ?? null,
          status: trainerUserId || groupId ? "active" : "pending"
        });

        if (insertAssignmentError) {
          throw insertAssignmentError;
        }
      }
    } catch (persistError) {
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      throw persistError;
    }

    return NextResponse.json({
      user: {
        id: createdUserId,
        alias: managedAccess.alias,
        email: managedAccess.email,
        password: managedAccess.password,
        fullName,
        role,
        gymName: gym.name,
        trainerUserId: role === "member" ? trainerUserId ?? null : null,
        groupId: role === "member" ? groupId ?? null : null
      }
    });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json(
      {
        error: info.message,
        details: info.details,
        hint: info.hint,
        code: info.code
      },
      { status: 500 }
    );
  }
}
