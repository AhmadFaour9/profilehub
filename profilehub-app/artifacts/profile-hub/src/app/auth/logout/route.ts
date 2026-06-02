import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createSupabaseServerActionClient, getAuthenticatedUser } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";

function safeRefererParts(referer: string | null) {
  if (!referer) return { referer_host: null, referer_path: null };

  try {
    const url = new URL(referer);
    return { referer_host: url.host, referer_path: url.pathname };
  } catch {
    return { referer_host: "invalid", referer_path: null };
  }
}

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    console.info("[AUTH] logout_called", {
      source: "route_handler",
      ...safeRefererParts(request.headers.get("referer")),
    });
    await getAuthenticatedUser("logout");
    const { supabase } = await createSupabaseServerActionClient("logout");
    await supabase.auth.signOut();
  }

  redirect("/login");
}
