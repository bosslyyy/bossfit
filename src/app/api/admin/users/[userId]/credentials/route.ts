import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { generateManagedAccessForGym } from "@/lib/supabase/managed-credentials";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { userId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from("gym_memberships")
      .select("gym_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (targetMembershipError) {
      throw targetMembershipError;
    }

    if (!targetMembership) {
      return NextResponse.json({ error: "No encontramos una membresía activa para ese usuario." }, { status: 404 });
    }

    const { data: requesterMembership, error: requesterMembershipError } = await supabase
      .from("gym_memberships")
      .select("id")
      .eq("gym_id", targetMembership.gym_id)
      .eq("user_id", requester.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (requesterMembershipError) {
      throw requesterMembershipError;
    }

    if (!requesterMembership) {
      return NextResponse.json({ error: "No tienes permisos para gestionar credenciales de este usuario." }, { status: 403 });
    }

    const [{ data: gym, error: gymError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("gyms").select("id, name, slug").eq("id", targetMembership.gym_id).maybeSingle(),
      supabase.from("profiles").select("full_name, display_name, email").eq("user_id", userId).maybeSingle()
    ]);

    if (gymError) {
      throw gymError;
    }

    if (profileError) {
      throw profileError;
    }

    if (!gym) {
      return NextResponse.json({ error: "No encontramos el gym del usuario." }, { status: 404 });
    }

    const fullName = profile?.full_name || profile?.display_name || `Usuario ${userId.slice(0, 6)}`;
    const managedAccess = await generateManagedAccessForGym(supabase, fullName, gym.slug, {
      excludeUserId: userId
    });

    const { data: updatedUser, error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
      email: managedAccess.email,
      password: managedAccess.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
        gym_slug: gym.slug,
        login_alias: managedAccess.alias
      }
    });

    if (updateUserError || !updatedUser.user) {
      throw updateUserError ?? new Error("No se pudo actualizar el acceso del usuario.");
    }

    const { error: profileUpsertError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email: managedAccess.email,
        full_name: fullName,
        display_name: fullName
      },
      { onConflict: "user_id" }
    );

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    return NextResponse.json({
      credentials: {
        userId,
        alias: managedAccess.alias,
        email: managedAccess.email,
        password: managedAccess.password,
        role: targetMembership.role,
        fullName
      }
    });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Admin: no se pudieron regenerar las credenciales.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
