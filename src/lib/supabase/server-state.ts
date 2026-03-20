import type { SupabaseClient } from "@supabase/supabase-js";

import { saveUserRemoteStateWithClient, fetchUserRemoteStateOrEmpty } from "@/lib/supabase/user-state-server";
import type { BossFitRemoteSnapshot } from "@/lib/supabase/data";

export type ServerRemoteState = Awaited<ReturnType<typeof fetchRemoteSnapshotForUser>>;

export async function fetchRemoteSnapshotForUser(
  supabase: SupabaseClient,
  userId: string
) {
  return fetchUserRemoteStateOrEmpty(supabase, userId);
}

export async function saveRemoteSnapshotForUser(
  supabase: SupabaseClient,
  userId: string,
  snapshot: Partial<BossFitRemoteSnapshot> | BossFitRemoteSnapshot
) {
  return saveUserRemoteStateWithClient(supabase, userId, {
    habits: snapshot.habits ?? [],
    completions: snapshot.completions ?? [],
    theme: snapshot.theme ?? "light",
    reminderSettings: snapshot.reminderSettings ?? {
      enabled: false,
      time: "19:00",
      permission: "default"
    }
  });
}
