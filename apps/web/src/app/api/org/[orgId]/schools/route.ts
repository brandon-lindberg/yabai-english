import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgWideAdmin, type MembershipForAuth } from "@/lib/org-authorization";

const createSchoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameJa: z.string().trim().max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  descriptionJa: z.string().trim().max(2000).optional(),
  applicationFlowEnabled: z.boolean().optional(),
  selfEnrollmentEnabled: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ orgId: string }> };

async function getCallerMembership(
  userId: string,
  orgId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, status: "ACTIVE" },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = {
    organizationId: orgId,
    // School-scoped members only see their school
    ...(!isOrgWideAdmin(caller) && caller.schoolId ? { id: caller.schoolId } : {}),
  };

  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true, slug: true, name: true, nameJa: true, nameEn: true,
      applicationFlowEnabled: true, selfEnrollmentEnabled: true,
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ schools });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);
  if (!caller || !isOrgWideAdmin(caller)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const school = await prisma.school.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ school }, { status: 201 });
}
