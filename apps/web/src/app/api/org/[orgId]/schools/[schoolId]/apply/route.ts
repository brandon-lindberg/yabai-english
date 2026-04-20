import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApplyToSchool } from "@/lib/school-enrollment";

const applySchema = z.object({
  applicationNote: z.string().trim().max(2000).optional(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string }>;
};

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;

  // Check school exists and has application flow enabled
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      organizationId: true,
      applicationFlowEnabled: true,
    },
  });

  if (!school || school.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check existing membership
  const existing = await prisma.organizationMembership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      schoolId,
    },
    select: { id: true, status: true },
  });

  const check = canApplyToSchool({
    applicationFlowEnabled: school.applicationFlowEnabled,
    existingMembershipStatus: existing?.status ?? null,
  });

  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // If re-applying (INACTIVE), update existing membership
  if (existing && existing.status === "INACTIVE") {
    const updated = await prisma.organizationMembership.update({
      where: { id: existing.id },
      data: {
        status: "PENDING_APPROVAL",
        applicationNote: parsed.data.applicationNote,
        orgRole: "STUDENT",
      },
    });
    return NextResponse.json({ application: updated }, { status: 201 });
  }

  const application = await prisma.organizationMembership.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      schoolId,
      orgRole: "STUDENT",
      status: "PENDING_APPROVAL",
      applicationNote: parsed.data.applicationNote,
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
