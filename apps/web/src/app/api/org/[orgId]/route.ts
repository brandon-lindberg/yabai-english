import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgWideAdmin, type MembershipForAuth } from "@/lib/org-authorization";

const updateOrgSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    nameJa: z.string().trim().max(200).optional(),
    nameEn: z.string().trim().max(200).optional(),
    timezone: z.string().trim().max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    descriptionJa: z.string().trim().max(2000).optional(),
  })
  .strip();

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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      schools: {
        select: {
          id: true, slug: true, name: true, nameJa: true, nameEn: true,
          _count: {
            select: { memberships: { where: { status: "ACTIVE" } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If school-scoped, filter to only their school(s)
  if (!isOrgWideAdmin(caller) && caller.schoolId) {
    org.schools = org.schools.filter((s) => s.id === caller.schoolId);
  }

  return NextResponse.json({ organization: org, callerRole: caller.orgRole });
}

export async function PATCH(req: Request, ctx: RouteContext) {
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

  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: parsed.data,
  });

  return NextResponse.json({ organization: updated });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.organization.delete({ where: { id: orgId } });
  return NextResponse.json({ ok: true });
}
