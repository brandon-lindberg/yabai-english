type IntegrationFeature = "calendar" | "drive" | "meet";

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

export function scopesForFeature(feature: IntegrationFeature): string[] {
  if (feature === "calendar") {
    return [GOOGLE_SCOPES.calendarEvents, GOOGLE_SCOPES.calendarReadonly];
  }
  if (feature === "drive") {
    return [GOOGLE_SCOPES.driveFile, GOOGLE_SCOPES.documents];
  }
  return [GOOGLE_SCOPES.meetSpaceCreated];
}

export function deriveConnectionFlags(scopes: string[]) {
  const uniqueScopes = new Set(scopes);
  return {
    calendarConnected:
      uniqueScopes.has(GOOGLE_SCOPES.calendarEvents) &&
      uniqueScopes.has(GOOGLE_SCOPES.calendarReadonly),
    driveConnected:
      uniqueScopes.has(GOOGLE_SCOPES.driveFile) &&
      uniqueScopes.has(GOOGLE_SCOPES.documents),
    meetConnected: uniqueScopes.has(GOOGLE_SCOPES.meetSpaceCreated),
  };
}

export function buildGoogleFeatureState(params: {
  userId: string;
  feature: IntegrationFeature;
  returnTo: string;
}) {
  return Buffer.from(
    `${params.userId}${stateSeparator}${params.feature}${stateSeparator}${params.returnTo}`,
    "utf8",
  ).toString("base64url");
}

export function featureFromState(state: string): {
  userId: string;
  feature: IntegrationFeature;
  returnTo: string;
} | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const [userId, feature, ...returnToParts] = raw.split(stateSeparator);
    const returnTo = returnToParts.join(stateSeparator);
    if (!userId || !returnTo) return null;
    if (feature !== "calendar" && feature !== "drive" && feature !== "meet") {
      return null;
    }
    return { userId, feature, returnTo };
  } catch {
    return null;
  }
}

export type { IntegrationFeature };
