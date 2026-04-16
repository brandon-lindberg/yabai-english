import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleGoogleCallback } from "@/lib/google/oauth-service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/dashboard?calendar=forbidden", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
  }

  try {
    await handleGoogleCallback(req, code, state);
    return NextResponse.redirect(new URL("/dashboard?calendar=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?calendar=failed", req.url));
  }
}
