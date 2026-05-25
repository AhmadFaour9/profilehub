import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
