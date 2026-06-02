import { redirect } from "next/navigation";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (isSupabaseConfigured()) {
    await getAuthenticatedUser("logout");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
