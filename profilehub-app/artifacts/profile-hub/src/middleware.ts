import { NextResponse, type NextRequest } from 'next/server';

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
  const supabaseResponse = NextResponse.next({ request });
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
