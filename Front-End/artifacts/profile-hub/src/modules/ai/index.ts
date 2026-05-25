import type { SupabaseClient } from "@supabase/supabase-js";
import { AIService } from "./services/AIService";
import { InMemoryAIRepository } from "./repositories/InMemoryAIRepository";
import { SupabaseAIRepository } from "./repositories/SupabaseAIRepository";

export * from "./domain/interfaces";
export { AIService };

export function createAIService(client?: SupabaseClient | null, currentUserId?: string): AIService {
  return new AIService(
    client ? new SupabaseAIRepository(client) : new InMemoryAIRepository(),
    currentUserId
  );
}
