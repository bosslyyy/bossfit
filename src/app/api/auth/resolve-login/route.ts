import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

function normalizeUsername(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier?: string };
    const rawIdentifier = body.identifier?.trim();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Escribe tu correo o usuario." }, { status: 400 });
    }

    if (rawIdentifier.includes("@")) {
      return NextResponse.json({ email: rawIdentifier.toLowerCase() });
    }

    const username = normalizeUsername(rawIdentifier);
    if (username.length < 3) {
      return NextResponse.json({ error: "Escribe un usuario válido." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.email) {
      return NextResponse.json({ error: "No encontramos una cuenta con ese acceso." }, { status: 404 });
    }

    return NextResponse.json({ email: data.email.toLowerCase(), username });
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
