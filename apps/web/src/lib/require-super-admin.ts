import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

/**
 * The SUPER_ADMIN gate for admin API routes.
 *
 * Was declared once per route file and copied. Sharing it means the distinction
 * that matters — 401 for "we don't know who you are", 403 for "we do and you
 * may not" — cannot drift between endpoints.
 *
 * Returns either `{ error }` to return straight to the caller, or `{ session }`.
 */
export async function requireSuperAdmin(): Promise<
  { error: NextResponse; session?: undefined } | { error?: undefined; session: Session }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
