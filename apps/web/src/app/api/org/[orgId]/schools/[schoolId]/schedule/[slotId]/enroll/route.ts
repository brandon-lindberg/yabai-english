import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { canEnrollStudent } from "@/lib/school-enrollment";

const enrollSchema = z.object({
  studentMembershipId: z.string().min(1),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; slotId: string }>;
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

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, slotId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { studentMembershipId } = parsed.data;

  if (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get slot and check capacity
  const slot = await prisma.schoolScheduleSlot.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      schoolId: true,
      capacity: true,
      active: true,
    },
  });

  if (!slot || slot.schoolId !== schoolId || !slot.active) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Count active enrollments
  const enrolledCount = await prisma.schoolClassEnrollment.count({
    where: { scheduleSlotId: slotId, active: true },
  });

  // Check existing enrollment
  const existing = await prisma.schoolClassEnrollment.findUnique({
    where: {
      scheduleSlotId_studentMembershipId: {
        scheduleSlotId: slotId,
        studentMembershipId,
      },
    },
  });

  const check = canEnrollStudent({
    enrolledCount,
    capacity: slot.capacity,
    studentMembershipStatus: "ACTIVE", // validated by membership lookup
    isAlreadyEnrolled: existing?.active ?? false,
  });

  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  // Re-activate if previously unenrolled, or create new
  let enrollment;
  if (existing && !existing.active) {
    enrollment = await prisma.schoolClassEnrollment.update({
      where: { id: existing.id },
      data: { active: true, enrolledAt: new Date(), unenrolledAt: null },
    });
  } else {
    enrollment = await prisma.schoolClassEnrollment.create({
      data: {
        scheduleSlotId: slotId,
        studentMembershipId,
      },
    });
  }

  return NextResponse.json({ enrollment }, { status: 201 });
}
