import { NextResponse } from "next/server";
import { auth } from "@/auth";

function resolveBaseUrl(req: Request): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard?calendar=misconfigured", req.url));
  }

  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/teacher/calendar/callback`;
  const state = encodeURIComponent(session.user.id);
  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar");
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code" +
    `&scope=${scope}` +
    "&access_type=offline" +
    "&prompt=consent" +
    `&state=${state}`;

  return NextResponse.redirect(authUrl);
}
