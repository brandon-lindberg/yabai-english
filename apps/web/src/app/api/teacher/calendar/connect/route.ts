import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleConnectUrl } from "@/lib/google/oauth-service";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = buildGoogleConnectUrl(req, {
    userId: session.user.id,
    feature: "calendar",
    returnTo: DASHBOARD_GOOGLE_SETTINGS_PATH,
  });
  if (!url) {
    return NextResponse.redirect(new URL("/dashboard?calendar=misconfigured", req.url));
  }
  return NextResponse.redirect(url);
}
