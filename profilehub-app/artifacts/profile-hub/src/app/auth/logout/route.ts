import { redirect } from "next/navigation";
import { createSupabaseServerActionClient, getAuthenticatedUser } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (isSupabaseConfigured()) {
    console.info("[AUTH] logout_called", { source: "route_handler" });
    await getAuthenticatedUser("logout");
    const { supabase } = await createSupabaseServerActionClient("logout");
    await supabase.auth.signOut();
  }

  redirect("/login");
}
