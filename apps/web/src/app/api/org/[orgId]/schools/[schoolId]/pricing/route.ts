import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

const createPricingSchema = z.object({
  lessonLevel: z.string().trim().optional(),
  lessonType: z.string().trim().optional(),
  durationMin: z.number().int().min(1),
  priceYen: z.number().int().min(0),
  isGroup: z.boolean().default(false),
});

const updatePricingSchema = z.object({
  lessonLevel: z.string().trim().optional(),
  lessonType: z.string().trim().optional(),
  durationMin: z.number().int().min(1).optional(),
  priceYen: z.number().int().min(0).optional(),
  isGroup: z.boolean().optional(),
  active: z.boolean().optional(),
});

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

  const pricing = await prisma.schoolLessonPricing.findMany({
    where: { schoolId, active: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ pricing });
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pricing = await prisma.schoolLessonPricing.create({
    data: { schoolId, ...parsed.data },
  });

  return NextResponse.json({ pricing }, { status: 201 });
}
