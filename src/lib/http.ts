// CSRF defense-in-depth for route handlers: confirm the request originated from
// our own site. Server Actions get this automatically; custom POST handlers do
// not, so we check it explicitly. (Cookies are also SameSite=lax.)
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Fall back to Referer if Origin is absent.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // A state-changing request with neither header is rejected.
  return false;
}
