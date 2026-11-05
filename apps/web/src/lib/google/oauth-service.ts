import { publicAppOrigin } from "@/lib/learning-sites";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptIntegrationToken } from "@/lib/calendar-token";
import {
  ALL_GOOGLE_SCOPES,
  buildPostCallbackReturnUrl,
  deriveConnectionFlags,
} from "@/lib/google/integration";

const resolveBaseUrl = publicAppOrigin;

function requireGoogleClient() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

export function buildGoogleConnectUrl(req: Request, params: {
  state: string;
}) {
  const creds = requireGoogleClient();
  if (!creds) return null;
  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;
  // Every scope, one consent screen, one round trip.
  const scope = ALL_GOOGLE_SCOPES.join(" ");
  return (
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(creds.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scope)}` +
    "&access_type=offline" +
    "&include_granted_scopes=true" +
    "&prompt=consent" +
    `&state=${encodeURIComponent(params.state)}`
  );
}

export async function handleGoogleCallback(req: Request, code: string, owner: { userId: string; returnTo: string }) {
  const creds = requireGoogleClient();
  if (!creds) {
    return {
      ok: false as const,
      redirectTo: buildPostCallbackReturnUrl(owner.returnTo, { google: "misconfigured" }),
    };
  }
  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;
  const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
  const tokenRes = await oauth2.getToken(code);
  const grantedScopes = (tokenRes.tokens.scope ?? "")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
  const flags = deriveConnectionFlags(grantedScopes);
  const tokenMetadataJson = JSON.parse(JSON.stringify(tokenRes.tokens));
  const accessToken = tokenRes.tokens.access_token
    ? encryptIntegrationToken(tokenRes.tokens.access_token)
    : null;
  const refreshToken = tokenRes.tokens.refresh_token
    ? encryptIntegrationToken(tokenRes.tokens.refresh_token)
    : null;

  const existing = await prisma.googleIntegrationAccount.findUnique({
    where: { userId: owner.userId },
  });

  await prisma.googleIntegrationAccount.upsert({
    where: { userId: owner.userId },
    create: {
      userId: owner.userId,
      provider: "google",
      providerAccountId: existing?.providerAccountId ?? owner.userId,
      accessToken: accessToken ?? existing?.accessToken ?? null,
      refreshToken: refreshToken ?? existing?.refreshToken ?? null,
      expiresAt: tokenRes.tokens.expiry_date
        ? new Date(tokenRes.tokens.expiry_date)
        : null,
      grantedScopes,
      tokenMetadataJson,
      revoked: false,
      disconnectedAt: null,
      lastSyncedAt: new Date(),
    },
    update: {
      accessToken: accessToken ?? existing?.accessToken ?? null,
      refreshToken: refreshToken ?? existing?.refreshToken ?? null,
      expiresAt: tokenRes.tokens.expiry_date
        ? new Date(tokenRes.tokens.expiry_date)
        : null,
      grantedScopes,
      tokenMetadataJson,
      revoked: false,
      disconnectedAt: null,
      lastSyncedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });

  /*
    The flags are now exactly what Google granted.

    They used to be OR-ed with whatever was already stored and force-set to true
    for the feature whose button you pressed, because consent was per-feature
    and Google's scope echo was unreliable. With a single all-scope consent,
    that fudge would actively lie: a user who declines Drive on the consent
    screen must not end up with `driveConnected: true` and a Drive call that
    fails at runtime.
  */
  await prisma.googleIntegrationSettings.upsert({
    where: { userId: owner.userId },
    create: {
      userId: owner.userId,
      calendarConnected: flags.calendarConnected,
      driveConnected: flags.driveConnected,
      meetConnected: flags.meetConnected,
      artifactSyncEnabled: flags.meetConnected,
    },
    update: {
      calendarConnected: flags.calendarConnected,
      driveConnected: flags.driveConnected,
      meetConnected: flags.meetConnected,
      // Only turn syncing on when Meet is granted; never turn off a preference
      // the user set for themselves.
      artifactSyncEnabled: flags.meetConnected ? true : undefined,
    },
  });

  return {
    ok: true as const,
    redirectTo: buildPostCallbackReturnUrl(owner.returnTo, { google: "connected" }),
  };
}
