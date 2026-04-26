import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgWideAdmin, isSchoolAdmin, type MembershipForAuth } from "@/lib/org-authorization";

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  nameJa: z.string().trim().max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  descriptionJa: z.string().trim().max(2000).optional(),
});

type RouteContext = { params: Promise<{ orgId: string; schoolId: string }> };

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId, organizationId: orgId, status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
    orderBy: { orgRole: "asc" },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  if (!school || school.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ school });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school || school.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: parsed.data,
  });

  return NextResponse.json({ school: updated });
}
