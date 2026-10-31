import { auth } from "@/auth";
import { handleGoogleCallback } from "@/lib/google/oauth-service";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";
import { readGoogleConnectState, googleConnectRedirect } from "@/lib/google/connect-state";
import { buildPostCallbackReturnUrl } from "@/lib/google/integration";

function resolvePublicBaseUrl(req: Request): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

export async function GET(req: Request) {
  const baseUrl = resolvePublicBaseUrl(req);
  const send = (path: string) => googleConnectRedirect(req, new URL(path, baseUrl));
  const session = await auth();
  if (!session?.user?.id) {
    return send("/auth/signin");
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const owner = state ? await readGoogleConnectState(req, state, session.user.id) : null;
  if (!owner) {
    return send(`${DASHBOARD_GOOGLE_SETTINGS_PATH}?google=invalid_state`);
  }
  const failedPath = buildPostCallbackReturnUrl(owner.returnTo, { google: "failed" });
  if (!code || searchParams.has("error")) {
    return send(failedPath);
  }

  try {
    const result = await handleGoogleCallback(req, code, { userId: session.user.id, returnTo: owner.returnTo });
    return send(result.redirectTo);
  } catch (error) {
    console.error("Google integration callback failed", error);
    return send(failedPath);
  }
}
