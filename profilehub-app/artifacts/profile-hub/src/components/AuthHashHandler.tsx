"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/modules/auth/client";
import { isSafeRedirectPath } from "@/modules/shared/validation";

/**
 * Completes an implicit-flow auth redirect that arrives as a URL hash.
 *
 * Supabase falls back to the Site URL when a requested `redirect_to` is not in
 * the project's Redirect URLs allow-list, and delivers the session as
 * `#access_token=...&refresh_token=...&type=recovery`. A hash fragment is never
 * sent to the server, so `/auth/callback` never sees it and the user lands on a
 * page with no session — which then renders "Invalid or expired link".
 *
 * This runs on every page and finishes the job client-side: it stores the
 * session through the SSR browser client (so the server sees it on the next
 * request), strips the tokens from the address bar, and forwards the user to
 * the right destination.
 *
 * With the allow-list configured correctly the PKCE `?code=` flow is used and
 * this component never fires. It is a safety net, not the primary path.
 */
export function AuthHashHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2 || !hash.includes("=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const errorCode = params.get("error") || params.get("error_code");

    if (!accessToken && !errorCode) return;

    handled.current = true;

    // Remove the tokens from the address bar before anything else, so they are
    // not kept in history or leaked through a copied URL or Referer header.
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", cleanUrl);

    if (errorCode) {
      const description = params.get("error_description") || "";
      const expired = /expired|invalid/i.test(`${errorCode} ${description}`);
      router.replace(`/auth/status?status=error&type=${expired ? "expired" : "unknown"}`);
      return;
    }

    if (!refreshToken) {
      router.replace("/auth/status?status=error&type=expired");
      return;
    }

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken,
      });

      if (error) {
        router.replace("/auth/status?status=error&type=expired");
        return;
      }

      if (type === "recovery") {
        router.replace("/auth/update-password");
        return;
      }

      const next = params.get("next");
      const destination =
        next && isSafeRedirectPath(next)
          ? next
          : type === "email_change"
            ? "/auth/status?status=success&type=email_updated"
            : type === "signup" || type === "email_confirm"
              ? "/auth/status?status=success&type=email_confirm"
              : "/dashboard";

      router.replace(destination);
      // The destination is server-rendered, so it needs the new session cookie.
      router.refresh();
    })();
  }, [router]);

  return null;
}
