import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgWideAdmin, isSchoolAdmin, type MembershipForAuth } from "@/lib/org-authorization";
import crypto from "crypto";

const addMemberSchema = z.object({
  email: z.string().trim().email(),
  orgRole: z.enum(["SCHOOL_ADMIN", "TEACHER", "STUDENT"]),
  schoolId: z.string().min(1),
});

type RouteContext = { params: Promise<{ orgId: string }> };

async function getCallerMembership(
  userId: string,
  orgId: string,
): Promise<MembershipForAuth | null> {
  const m = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      schoolId: true,
      orgRole: true,
      status: true,
    },
  });
  return m;
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);

  if (!caller || !isOrgWideAdmin(caller)) {
    // School admins can list via the school-scoped endpoint instead
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const schoolId = url.searchParams.get("schoolId") ?? undefined;

  const where = {
    organizationId: orgId,
    ...(schoolId ? { schoolId } : {}),
  };

  const [members, total] = await Promise.all([
    prisma.organizationMembership.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organizationMembership.count({ where }),
  ]);

  return NextResponse.json({ members, total });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);

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

  // Find or identify target user
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (targetUser) {
    // Check for existing membership at this school
    const existing = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUser.id,
        schoolId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User already has a membership at this school" },
        { status: 409 },
      );
    }
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");

  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId: orgId,
      userId: targetUser?.id ?? session.user.id, // fallback for email-only invite (future: create placeholder)
      schoolId,
      orgRole,
      status: "INVITED",
      invitedByUserId: session.user.id,
      invitedAt: new Date(),
      inviteEmail: email,
      inviteToken,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
