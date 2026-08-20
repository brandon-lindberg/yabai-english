import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgWideAdmin, isSchoolAdmin } from "@/lib/org-authorization";
import { createUserNotification } from "@/lib/notifications";
import { getOrgCallerMembership } from "@/lib/org/caller-membership";
import { orgMemberScope, summarizeOrgMembers } from "@/lib/org/org-members";

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  orgRole: z.enum(["SCHOOL_ADMIN", "TEACHER", "STUDENT"]),
  schoolId: z.string().min(1),
});

type RouteContext = { params: Promise<{ orgId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getOrgCallerMembership(session.user.id, orgId);

  if (!caller || !isOrgWideAdmin(caller)) {
    // School admins can list via the school-scoped endpoint instead
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const schoolId = url.searchParams.get("schoolId") ?? undefined;

  /*
    `orgMemberScope` rather than a hand-built filter, for two reasons the old
    one got wrong: it had no status filter at all, so INVITED and INACTIVE rows
    came back as members; and scoping a school to `{ schoolId }` alone dropped
    the organization's own people, who hold no `schoolId` and yet cover every
    school — the same rule `getViewerSchoolRole` uses to let them in.
  */
  const where = orgMemberScope(orgId, schoolId);

  const members = await prisma.organizationMembership.findMany({
    where,
    select: {
      id: true,
      orgRole: true,
      status: true,
      schoolId: true,
      userId: true,
      inviteEmail: true,
      school: { select: { name: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // People, not grants — the same count every other surface now reports.
  const total = summarizeOrgMembers(members).members;

  return NextResponse.json({ members, total });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getOrgCallerMembership(session.user.id, orgId);

  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, orgRole, schoolId } = parsed.data;

  // Authorization: must be admin for the target school
  if (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reject if this email is already invited or active at this school.
  const existingByEmail = await prisma.organizationMembership.findFirst({
    where: { organizationId: orgId, schoolId, inviteEmail: email },
    select: { id: true },
  });
  if (existingByEmail) {
    return NextResponse.json(
      { error: "This email is already a member or invited at this school" },
      { status: 409 },
    );
  }

  // If a User row already exists for this email, link it eagerly so the
  // invite shows up in their nav before they re-sign-in.
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId: orgId,
      userId: targetUser?.id ?? null,
      schoolId,
      orgRole,
      status: "INVITED",
      invitedByUserId: session.user.id,
      invitedAt: new Date(),
      inviteEmail: email,
    },
  });

  if (targetUser) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const orgName = org?.name ?? "an organization";
    await createUserNotification({
      userId: targetUser.id,
      titleJa: "招待が届きました",
      titleEn: "You have been invited",
      bodyJa: `${orgName}から招待されました。`,
      bodyEn: `You have been invited to join ${orgName}.`,
    });
  }

  return NextResponse.json({ membership }, { status: 201 });
}
