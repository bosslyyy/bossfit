import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactToken(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function buildGymCode(gymSlug: string) {
  const parts = normalizeText(gymSlug)
    .split(" ")
    .filter(Boolean);

  const initials = parts.map((part) => part[0]).join("").slice(0, 4);
  if (initials.length >= 2) {
    return initials;
  }

  const compact = parts.join("").slice(0, 4);
  return compact || "bf";
}

function buildAliasCandidates(fullName: string) {
  const tokens = normalizeText(fullName)
    .split(" ")
    .filter(Boolean);

  const first = compactToken(tokens[0] ?? "usuario");
  const second = compactToken(tokens[1] ?? "");
  const last = compactToken(tokens[tokens.length - 1] ?? "");

  const candidates = [
    `${first}${last ? last[0] : ""}`,
    `${first[0] ?? "u"}${last}`,
    `${first}${second ? second[0] : ""}`,
    `${first}${tokens.length > 2 ? compactToken(tokens[2]).slice(0, 1) : ""}`,
    first,
    last,
    `${first.slice(0, 1)}${last.slice(0, 10)}`
  ]
    .map((candidate) => candidate.replace(/[^a-z0-9]/g, "").slice(0, 18))
    .filter((candidate) => candidate.length >= 3);

  return [...new Set(candidates.length ? candidates : ["usuario"] )];
}

async function emailExists(supabase: SupabaseClient, email: string, excludeUserId?: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return false;
  }

  return data.user_id !== excludeUserId;
}

function buildManagedEmail(alias: string, gymSlug: string) {
  const gymCode = buildGymCode(gymSlug);
  return `${alias}@${gymCode}.bossfit.app`;
}

export function generateTemporaryPassword() {
  const raw = randomBytes(12).toString("base64url");
  return `Bf!${raw.slice(0, 10)}9`;
}

export async function generateManagedAccessForGym(
  supabase: SupabaseClient,
  fullName: string,
  gymSlug: string,
  options?: {
    excludeUserId?: string;
  }
) {
  const aliasCandidates = buildAliasCandidates(fullName);

  for (const candidate of aliasCandidates) {
    const email = buildManagedEmail(candidate, gymSlug);
    const exists = await emailExists(supabase, email, options?.excludeUserId);
    if (!exists) {
      return {
        alias: candidate,
        email,
        password: generateTemporaryPassword()
      };
    }
  }

  const fallbackBase = aliasCandidates[0] ?? "usuario";
  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const alias = `${fallbackBase.slice(0, Math.max(3, 18 - String(suffix).length))}${suffix}`;
    const email = buildManagedEmail(alias, gymSlug);
    const exists = await emailExists(supabase, email, options?.excludeUserId);
    if (!exists) {
      return {
        alias,
        email,
        password: generateTemporaryPassword()
      };
    }
  }

  const alias = `${fallbackBase.slice(0, 12)}${randomBytes(2).toString("hex")}`;
  return {
    alias,
    email: buildManagedEmail(alias, gymSlug),
    password: generateTemporaryPassword()
  };
}
