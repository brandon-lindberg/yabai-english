const ALLOWED_PREFIXES = [
  "/book",
  "/dashboard",
  "/onboarding",
  "/placement",
  "/learn",
] as const;

const MAX_LEN = 2048;

/**
 * Strips optional `/ja` or `/en` locale prefix from a pathname (for prefix checks only).
 */
export function stripOptionalLocalePrefix(pathname: string): string {
  for (const loc of ["ja", "en"] as const) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname.slice(`/${loc}`.length);
    }
  }
  return pathname;
}

function pathMatchesAllowedPrefix(pathWithoutQuery: string): boolean {
  const normalized = stripOptionalLocalePrefix(pathWithoutQuery);
  return ALLOWED_PREFIXES.some(
    (root) => normalized === root || normalized.startsWith(`${root}/`),
  );
}

/**
 * Validates `callbackUrl` from untrusted input (OAuth redirect). Returns a safe
 * same-site path + optional query, or `fallback`.
 */
export function resolveSafeCallbackUrl(
  raw: string | undefined | null,
  fallback = "/dashboard",
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  let decoded = raw.trim();
  if (!decoded) return fallback;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }
  if (decoded.length > MAX_LEN) return fallback;
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.includes("://") || decoded.startsWith("//") || decoded.includes("\\")) return fallback;
  if (decoded.includes("@")) return fallback;
  const pathPart = decoded.split("?")[0] ?? "";
  if (pathPart.includes("..")) return fallback;
  if (!pathMatchesAllowedPrefix(pathPart)) return fallback;
  return decoded;
}
