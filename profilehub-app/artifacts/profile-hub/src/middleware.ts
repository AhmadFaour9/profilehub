import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicEnv, isSupabaseConfigured } from '@/lib/env';

function isProtectedPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/dashboard");
}

function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register";
}

function withRefreshedCookies(response: NextResponse, refreshedResponse: NextResponse): NextResponse {
  refreshedResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
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
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return withRefreshedCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  if (user && isAuthPath(pathname)) {
    return withRefreshedCookies(NextResponse.redirect(new URL("/dashboard", request.url)), supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
