import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

const updateSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startMin: z.number().int().min(0).max(1439).optional(),
  endMin: z.number().int().min(1).max(1440).optional(),
  durationMin: z.number().int().min(1).optional(),
  lessonLevel: z.string().trim().min(1).optional(),
  lessonType: z.string().trim().min(1).optional(),
  labelJa: z.string().trim().optional(),
  labelEn: z.string().trim().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  assignedTeacherMembershipId: z.string().nullable().optional(),
  active: z.boolean().optional(),
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

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, slotId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slot = await prisma.schoolScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.schoolScheduleSlot.update({
    where: { id: slotId },
    data: parsed.data,
  });

  return NextResponse.json({ slot: updated });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, slotId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slot = await prisma.schoolScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft-delete by deactivating
  await prisma.schoolScheduleSlot.update({
    where: { id: slotId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
