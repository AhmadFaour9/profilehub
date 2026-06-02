import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicEnv, isSupabaseConfigured } from '@/lib/env';

function isAuthSensitivePath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname === "/account/preview" || pathname.startsWith("/dashboard");
}

function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register";
}

function preventAuthCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();

  const { url, publicKey } = getSupabasePublicEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const operation = options?.maxAge === 0 ? "remove" : "set";
          console.info("[AUTH] supabase_cookie_set_attempt", {
            source: "middleware",
            mode: "writable",
            cookie_name: name,
            operation,
          });

          try {
            request.cookies.set(name, value);
            console.info("[AUTH] supabase_cookie_set_success", {
              source: "middleware",
              cookie_name: name,
              operation,
            });
          } catch (error) {
            console.warn("[AUTH] supabase_cookie_set_failed", {
              source: "middleware",
              cookie_name: name,
              operation,
              message: error instanceof Error ? error.message : "unknown_error",
            });
          }
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const operation = options?.maxAge === 0 ? "remove" : "set";
          try {
            supabaseResponse.cookies.set(name, value, options);
            console.info("[AUTH] supabase_cookie_set_success", {
              source: "middleware_response",
              cookie_name: name,
              operation,
            });
          } catch (error) {
            console.warn("[AUTH] supabase_cookie_set_failed", {
              source: "middleware_response",
              cookie_name: name,
              operation,
              message: error instanceof Error ? error.message : "unknown_error",
            });
          }
        });
      },
    },
  });

  await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (isAuthSensitivePath(pathname) || isAuthPath(pathname)) {
    return preventAuthCache(supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
