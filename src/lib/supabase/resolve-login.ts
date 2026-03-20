export async function resolveLoginEmail(identifier: string) {
  const trimmed = identifier.trim();

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  const response = await fetch("/api/auth/resolve-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ identifier: trimmed }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as { email?: string; error?: string } | null;

  if (!response.ok || !payload?.email) {
    throw new Error(payload?.error || "No encontramos una cuenta con ese acceso.");
  }

  return payload.email;
}
