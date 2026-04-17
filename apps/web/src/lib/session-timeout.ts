const DEFAULT_IDLE_TIMEOUT_MINUTES = 12 * 60;

function parsePositiveMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function getInactivityTimeoutMinutes(): number {
  return (
    parsePositiveMinutes(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES) ??
    parsePositiveMinutes(process.env.AUTH_IDLE_TIMEOUT_MINUTES) ??
    DEFAULT_IDLE_TIMEOUT_MINUTES
  );
}

export function getInactivityTimeoutMs(): number {
  return getInactivityTimeoutMinutes() * 60_000;
}

export function getSessionMaxAgeSeconds(): number {
  return getInactivityTimeoutMinutes() * 60;
}
