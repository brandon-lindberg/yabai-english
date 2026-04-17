import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptIntegrationToken } from "@/lib/calendar-token";
import {
  buildGoogleFeatureState,
  buildPostCallbackReturnUrl,
  deriveConnectionFlags,
  featureFromState,
  scopesForFeature,
  type IntegrationFeature,
} from "@/lib/google/integration";

function resolveBaseUrl(req: Request): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

function requireGoogleClient() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

export function buildGoogleConnectUrl(req: Request, params: {
  userId: string;
  feature: IntegrationFeature;
  returnTo?: string;
}) {
  const creds = requireGoogleClient();
  if (!creds) return null;
  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;
  const scope = scopesForFeature(params.feature).join(" ");
  const state = buildGoogleFeatureState({
    userId: params.userId,
    feature: params.feature,
    returnTo: params.returnTo ?? "/dashboard/integrations",
  });
  return (
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(creds.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scope)}` +
    "&access_type=offline" +
    "&include_granted_scopes=true" +
    "&prompt=consent" +
    `&state=${encodeURIComponent(state)}`
  );
}

export async function handleGoogleCallback(req: Request, code: string, state: string) {
  const parsed = featureFromState(state);
  if (!parsed) {
    return { ok: false as const, redirectTo: "/dashboard/integrations?google=invalid_state" };
  }
  const creds = requireGoogleClient();
  if (!creds) {
    return {
      ok: false as const,
      redirectTo: buildPostCallbackReturnUrl(parsed.returnTo, {
        google: "misconfigured",
        feature: parsed.feature,
      }),
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
    where: { userId: parsed.userId },
  });

  await prisma.googleIntegrationAccount.upsert({
    where: { userId: parsed.userId },
    create: {
      userId: parsed.userId,
      provider: "google",
      providerAccountId: existing?.providerAccountId ?? parsed.userId,
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

  await prisma.googleIntegrationSettings.upsert({
    where: { userId: parsed.userId },
    create: {
      userId: parsed.userId,
      calendarConnected: flags.calendarConnected,
      driveConnected: flags.driveConnected,
      meetConnected: flags.meetConnected,
      artifactSyncEnabled: parsed.feature === "meet" ? flags.meetConnected : false,
    },
    update: {
      calendarConnected: flags.calendarConnected,
      driveConnected: flags.driveConnected,
      meetConnected: flags.meetConnected,
      artifactSyncEnabled:
        parsed.feature === "meet" ? flags.meetConnected : undefined,
    },
  });

  return {
    ok: true as const,
    redirectTo: buildPostCallbackReturnUrl(parsed.returnTo, {
      google: "connected",
      feature: parsed.feature,
    }),
  };
}
