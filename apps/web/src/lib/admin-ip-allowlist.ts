/**
 * IP allowlist for SUPER_ADMIN surfaces (`/api/admin/*` and `/[locale]/admin/*`).
 *
 * Configured via the `ADMIN_IP_ALLOWLIST` env var: a comma-separated list of
 * IPv4/IPv6 addresses and IPv4 CIDR ranges (e.g. "203.0.113.5,198.51.100.0/24").
 * When unset, no restriction is applied (local dev, preview environments).
 */

const ADMIN_PATH_PATTERN = /^(?:\/(?:en|ja))?\/admin(?:\/|$)|^\/api\/admin(?:\/|$)/;

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PATTERN.test(pathname);
}

export function parseAdminIpAllowlist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function matchesIpv4Cidr(ip: string, cidr: string): boolean {
  const [network, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt === null || networkInt === null) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((networkInt & mask) >>> 0);
}

/** Normalizes IPv4-mapped IPv6 addresses (::ffff:1.2.3.4) to plain IPv4. */
function normalizeIp(ip: string): string {
  const lower = ip.trim().toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? mapped[1] : lower;
}

export function isIpAllowed(
  clientIp: string | null | undefined,
  allowlist: string[],
): boolean {
  if (!clientIp) return false;
  const ip = normalizeIp(clientIp);
  return allowlist.some((entry) => {
    const candidate = entry.toLowerCase();
    if (candidate.includes("/")) return matchesIpv4Cidr(ip, candidate);
    return normalizeIp(candidate) === ip;
  });
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

export function shouldBlockAdminRequest({
  pathname,
  clientIp,
  allowlistRaw,
}: {
  pathname: string;
  clientIp: string | null;
  allowlistRaw: string | null | undefined;
}): boolean {
  const allowlist = parseAdminIpAllowlist(allowlistRaw);
  if (allowlist.length === 0) return false;
  if (!isAdminPath(pathname)) return false;
  return !isIpAllowed(clientIp, allowlist);
}
