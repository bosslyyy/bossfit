import type { SupabaseClient } from "@supabase/supabase-js";

import { saveUserRemoteStateWithClient, fetchUserRemoteStateOrEmpty } from "@/lib/supabase/user-state-server";
import type { BossFitRemoteSnapshot, SaveRemoteStateOptions } from "@/lib/supabase/data";

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
  snapshot: BossFitRemoteSnapshot,
  options: SaveRemoteStateOptions = {}
) {
  return saveUserRemoteStateWithClient(supabase, userId, snapshot, options);
}
