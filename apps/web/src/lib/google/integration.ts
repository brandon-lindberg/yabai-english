const stateSeparator = ":";

export const GOOGLE_SCOPES = {
  identityOpenId: "openid",
  identityEmail: "email",
  identityProfile: "profile",
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
  calendarReadonly: "https://www.googleapis.com/auth/calendar.readonly",
  driveFile: "https://www.googleapis.com/auth/drive.file",
  documents: "https://www.googleapis.com/auth/documents",
  meetSpaceCreated: "https://www.googleapis.com/auth/meetings.space.created",
} as const;

/**
 * Everything the app asks Google for, in one consent.
 *
 * Connecting used to be three separate journeys — Calendar, Drive/Docs and Meet
 * each had their own button, their own OAuth round trip and their own consent
 * screen. A teacher had to work out which of the three they needed, and most
 * connected one and wondered why the others did nothing. It is one product
 * feature, so it is one decision: connect Google, or don't.
 */
export const ALL_GOOGLE_SCOPES: string[] = [
  GOOGLE_SCOPES.calendarEvents,
  GOOGLE_SCOPES.calendarReadonly,
  GOOGLE_SCOPES.driveFile,
  GOOGLE_SCOPES.documents,
  GOOGLE_SCOPES.meetSpaceCreated,
];

/**
 * Which capabilities are actually usable, read from what Google granted.
 *
 * These stay per-capability even though consent is now single: a user can
 * decline an individual scope on Google's screen, and the code that calls
 * Calendar or Drive must not attempt a call it has no permission for. One
 * button to ask; three honest answers about what came back.
 */
export function deriveConnectionFlags(scopes: string[]) {
  const uniqueScopes = new Set(scopes);
  return {
    calendarConnected:
      uniqueScopes.has(GOOGLE_SCOPES.calendarEvents) ||
      uniqueScopes.has(GOOGLE_SCOPES.calendarReadonly),
    driveConnected:
      uniqueScopes.has(GOOGLE_SCOPES.driveFile) &&
      uniqueScopes.has(GOOGLE_SCOPES.documents),
    meetConnected: uniqueScopes.has(GOOGLE_SCOPES.meetSpaceCreated),
  };
}

/**
 * True when every scope the app needs was granted.
 *
 * Users who connected under the old per-feature flow hold a partial grant.
 * Rather than migrating their rows, the settings screen reads this and offers
 * to reconnect — which is the only thing that can actually fix a missing scope.
 */
export function hasAllGoogleScopes(scopes: string[]): boolean {
  const granted = new Set(scopes);
  return ALL_GOOGLE_SCOPES.every((scope) => granted.has(scope));
}

export function buildGoogleConnectState(params: { userId: string; returnTo: string }) {
  return Buffer.from(
    `${params.userId}${stateSeparator}${params.returnTo}`,
    "utf8",
  ).toString("base64url");
}

export function parseGoogleConnectState(state: string): {
  userId: string;
  returnTo: string;
} | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const [userId, ...returnToParts] = raw.split(stateSeparator);
    const returnTo = returnToParts.join(stateSeparator);
    if (!userId || !returnTo) return null;
    return { userId, returnTo };
  } catch {
    return null;
  }
}

export function buildPostCallbackReturnUrl(
  returnTo: string,
  params: { google: string },
): string {
  const placeholderBase = "http://__local__";
  let url: URL;
  try {
    url = new URL(returnTo, placeholderBase);
  } catch {
    const sep = returnTo.includes("?") ? "&" : "?";
    return `${returnTo}${sep}google=${encodeURIComponent(params.google)}`;
  }

  if (url.origin !== placeholderBase) {
    url = new URL(url.pathname + url.search + url.hash, placeholderBase);
  }

  url.searchParams.set("google", params.google);
  // `feature` is deliberately cleared rather than left: a stale one from an old
  // link would describe a per-feature flow that no longer exists.
  url.searchParams.delete("feature");

  return `${url.pathname}${url.search}${url.hash}`;
}
