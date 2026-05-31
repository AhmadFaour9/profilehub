import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicEnv, isSupabaseConfigured } from '@/lib/env';

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
          supabaseResponse.cookies.set(name, value, { ...options, maxAge: 604800 })
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Let the application layout and pages handle authorization redirects.
  // We only use the middleware to reliably refresh the Supabase session token.

  return supabaseResponse;
}

export const config = {
  matcher: ['/onboarding', '/login', '/register'],
};
