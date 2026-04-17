import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleGoogleCallback } from "@/lib/google/oauth-service";

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", baseUrl));
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/integrations?google=failed", baseUrl),
    );
  }

  try {
    const result = await handleGoogleCallback(req, code, state);
    return NextResponse.redirect(new URL(result.redirectTo, baseUrl));
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/integrations?google=failed", baseUrl),
    );
  }
}
