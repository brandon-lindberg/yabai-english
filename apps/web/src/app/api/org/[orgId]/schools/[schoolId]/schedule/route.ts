import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { validateSlotTimes } from "@/lib/school-scheduling";

const createSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
  durationMin: z.number().int().min(1),
  lessonLevel: z.string().trim().min(1),
  lessonType: z.string().trim().min(1),
  labelJa: z.string().trim().optional(),
  labelEn: z.string().trim().optional(),
  capacity: z.number().int().min(1).max(100).default(1),
  assignedTeacherMembershipId: z.string().optional(),
  classLevelId: z.string().min(1).optional().nullable(),
  classTypeId: z.string().min(1).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string }>;
};

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  // Try org-wide first, then school-scoped
  const m = await prisma.organizationMembership.findFirst({
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
    orderBy: { orgRole: "asc" }, // OWNER sorts first
  });
  return m;
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

  // Any active member can view the schedule
  const isOrgAdmin = isOrgWideAdmin(caller);
  const hasSchoolAccess =
    isOrgAdmin || caller.schoolId === schoolId;

  if (!hasSchoolAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slots = await prisma.schoolScheduleSlot.findMany({
    where: { schoolId, active: true },
    include: {
      assignedTeacher: {
        select: {
          id: true,
          orgRole: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
      classLevel: {
        select: {
          id: true,
          code: true,
          label: true,
          labelJa: true,
          labelEn: true,
        },
      },
      classType: {
        select: {
          id: true,
          code: true,
          label: true,
          labelJa: true,
          labelEn: true,
        },
      },
      _count: { select: { enrollments: { where: { active: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
  });

  let viewerEnrolledSlotIds: string[] = [];
  if (caller.orgRole === "STUDENT" && caller.schoolId === schoolId) {
    const enrollments = await prisma.schoolClassEnrollment.findMany({
      where: { studentMembershipId: caller.id, active: true },
      select: { scheduleSlotId: true },
    });
    viewerEnrolledSlotIds = enrollments.map((e) => e.scheduleSlotId);
  }

  return NextResponse.json({ slots, viewerEnrolledSlotIds });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (
    !caller ||
    (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Validate business rules
  const validation = validateSlotTimes({
    dayOfWeek: data.dayOfWeek,
    startMin: data.startMin,
    endMin: data.endMin,
    durationMin: data.durationMin,
    capacity: data.capacity,
  });
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  if (data.classLevelId) {
    const lvl = await prisma.schoolClassLevel.findUnique({
      where: { id: data.classLevelId },
      select: { id: true, schoolId: true },
    });
    if (!lvl || lvl.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "classLevelId does not belong to this school" },
        { status: 400 },
      );
    }
  }

  if (data.classTypeId) {
    const t = await prisma.schoolClassType.findUnique({
      where: { id: data.classTypeId },
      select: { id: true, schoolId: true },
    });
    if (!t || t.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "classTypeId does not belong to this school" },
        { status: 400 },
      );
    }
  }

  // Resolve timezone from school or org
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { timezone: true, organization: { select: { timezone: true } } },
  });
  const timezone =
    school?.timezone ?? school?.organization?.timezone ?? "Asia/Tokyo";

  const slot = await prisma.schoolScheduleSlot.create({
    data: {
      schoolId,
      dayOfWeek: data.dayOfWeek,
      startMin: data.startMin,
      endMin: data.endMin,
      durationMin: data.durationMin,
      timezone,
      lessonLevel: data.lessonLevel,
      lessonType: data.lessonType,
      labelJa: data.labelJa,
      labelEn: data.labelEn,
      capacity: data.capacity,
      assignedTeacherMembershipId: data.assignedTeacherMembershipId,
      classLevelId: data.classLevelId ?? null,
      classTypeId: data.classTypeId ?? null,
    },
  });

  return NextResponse.json({ slot }, { status: 201 });
}
