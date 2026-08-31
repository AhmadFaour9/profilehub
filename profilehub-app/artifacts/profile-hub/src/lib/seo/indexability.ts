/** Paths that are useful to an authenticated visitor but never belong in search. */
export function isNonIndexablePath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/onboarding" ||
    pathname === "/test-auth" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/go/")
  );
}
