import type { SupabaseClient } from "@supabase/supabase-js";
import { ProfileService } from "./services/ProfileService";
import { SupabaseProfileRepository } from "./repositories/SupabaseProfileRepository";
import { SupabaseLinkRepository } from "./repositories/SupabaseLinkRepository";
import { SupabaseProjectRepository } from "./repositories/SupabaseProjectRepository";

export * from "./domain/interfaces";
export { ProfileService };

export function createProfileService(client: SupabaseClient, currentUserId?: string): ProfileService {
  return new ProfileService(
    new SupabaseProfileRepository(client),
    new SupabaseLinkRepository(client),
    new SupabaseProjectRepository(client),
    currentUserId
  );
}
