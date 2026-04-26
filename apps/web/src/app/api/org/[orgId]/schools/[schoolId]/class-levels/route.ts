import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

const createSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(100),
    labelJa: z.string().trim().max(100).optional().nullable(),
    labelEn: z.string().trim().max(100).optional().nullable(),
  })
  .strip();

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string }>;
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

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const classLevels = await prisma.schoolClassLevel.findMany({
    where: { schoolId, active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({ classLevels });
}

export async function POST(req: Request, ctx: RouteContext) {
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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.schoolClassLevel.findUnique({
    where: { schoolId_code: { schoolId, code: parsed.data.code } },
    select: { id: true, active: true },
  });

  if (existing?.active) {
    return NextResponse.json(
      { error: "A class level with this code already exists." },
      { status: 409 },
    );
  }

  const last = await prisma.schoolClassLevel.findMany({
    where: { schoolId },
    orderBy: { sortOrder: "desc" },
    take: 1,
    select: { sortOrder: true },
  });
  const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

  if (existing) {
    const classLevel = await prisma.schoolClassLevel.update({
      where: { id: existing.id },
      data: { ...parsed.data, sortOrder, active: true },
    });
    return NextResponse.json({ classLevel }, { status: 201 });
  }

  const classLevel = await prisma.schoolClassLevel.create({
    data: { schoolId, ...parsed.data, sortOrder },
  });

  return NextResponse.json({ classLevel }, { status: 201 });
}
