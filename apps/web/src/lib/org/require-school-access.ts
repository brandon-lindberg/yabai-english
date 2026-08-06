import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOrgWideAdmin, isSchoolAdmin, type MembershipForAuth } from "@/lib/org-authorization";
import { getSchoolCallerMembership } from "@/lib/org/caller-membership";

/**
 * The school-route preamble: signed in, a member of this org, and — when the
 * route writes — an admin of this school.
 *
 * Every school-scoped route opened with the same twelve to fifteen lines:
 * `auth()` → 401, resolve the membership → 403, then optionally check admin →
 * 403. jscpd flagged it as the single largest cross-file clone cluster in the
 * repository, spanning some twenty routes.
 *
 * Collapsing it also removes a way to get authorization subtly wrong: the
 * admin check and the membership lookup can no longer drift apart, and a new
 * route cannot ship having done the first but forgotten the second.
 */
export async function requireSchoolAccess(
  params: Promise<{ orgId: string; schoolId: string }>,
  options: { adminOnly?: boolean } = {},
): Promise<
  | { ok: true; orgId: string; schoolId: string; caller: MembershipForAuth }
  | { ok: false; res: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { orgId, schoolId } = await params;
  const caller = await getSchoolCallerMembership(session.user.id, orgId, schoolId);
  if (!caller) {
    return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (options.adminOnly && !isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId)) {
    return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, orgId, schoolId, caller };
}
