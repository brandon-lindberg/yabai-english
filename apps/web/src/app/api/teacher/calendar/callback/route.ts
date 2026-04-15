import { google } from "googleapis";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptRefreshToken } from "@/lib/calendar-token";

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
    return NextResponse.redirect(new URL("/dashboard?calendar=forbidden", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || decodeURIComponent(state) !== session.user.id) {
    return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard?calendar=misconfigured", req.url));
  }

  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/teacher/calendar/callback`;

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const tokenRes = await oauth2.getToken(code);
    const refreshToken = tokenRes.tokens.refresh_token;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
    }

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
    }

    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: {
        googleCalendarRefreshToken: encryptRefreshToken(refreshToken),
      },
    });

    return NextResponse.redirect(new URL("/dashboard?calendar=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
  }
}
