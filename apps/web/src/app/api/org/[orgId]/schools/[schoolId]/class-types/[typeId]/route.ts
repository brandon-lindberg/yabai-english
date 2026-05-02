import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

const updateSchema = z.object({
  code: z.string().trim().min(1).max(64).optional(),
  labelEn: z.string().trim().min(1).max(100).optional(),
  labelJa: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; typeId: string }>;
};

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      schoolId: true,
      orgRole: true,
      status: true,
    },
    orderBy: { orgRole: "asc" },
  });
}

async function authorizeAdmin(
  orgId: string,
  schoolId: string,
): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { orgId, schoolId, typeId } = await ctx.params;
  const denied = await authorizeAdmin(orgId, schoolId);
  if (denied) return denied;

  const existing = await prisma.schoolClassType.findUnique({
    where: { id: typeId },
    select: { id: true, schoolId: true },
  });
  if (!existing || existing.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const classType = await prisma.schoolClassType.update({
    where: { id: typeId },
    data: parsed.data,
  });

  return NextResponse.json({ classType });
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { orgId, schoolId, typeId } = await ctx.params;
  const denied = await authorizeAdmin(orgId, schoolId);
  if (denied) return denied;

  const existing = await prisma.schoolClassType.findUnique({
    where: { id: typeId },
    select: { id: true, schoolId: true },
  });
  if (!existing || existing.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.schoolClassType.update({
    where: { id: typeId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
