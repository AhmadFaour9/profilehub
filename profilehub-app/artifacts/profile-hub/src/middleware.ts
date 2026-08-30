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

export const PATHNAME_HEADER = "x-profilehub-pathname";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Layouts do not receive the pathname in the App Router, so it is forwarded
  // as a request header for the dashboard layout to read.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  const supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

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
