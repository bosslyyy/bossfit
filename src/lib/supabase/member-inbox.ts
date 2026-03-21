import type { MemberInboxResponse } from "@/types/coach";

async function requestMemberJson<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "No se pudo completar la operación de tu coach.");
  }

  return payload as T;
}

export function fetchMemberInbox(accessToken: string) {
  return requestMemberJson<MemberInboxResponse>(`/api/member/inbox?t=${Date.now()}`, accessToken);
}

export function markMemberInboxRead(accessToken: string) {
  return requestMemberJson<MemberInboxResponse>("/api/member/inbox", accessToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "mark_read" })
  });
}

export function dismissMemberAlert(accessToken: string, alertId: string) {
  return requestMemberJson<MemberInboxResponse>("/api/member/inbox", accessToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "dismiss_alert", alertId })
  });
}

export function sendMemberMessage(accessToken: string, body: string) {
  return requestMemberJson<MemberInboxResponse>("/api/member/messages", accessToken, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

