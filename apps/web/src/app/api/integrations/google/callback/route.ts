import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleGoogleCallback } from "@/lib/google/oauth-service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/integrations?google=failed", req.url));
  }

  try {
    const result = await handleGoogleCallback(req, code, state);
    return NextResponse.redirect(new URL(result.redirectTo, req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/integrations?google=failed", req.url));
  }
}
