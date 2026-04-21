import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { planMaterializedBookings } from "@/lib/school-scheduling";
import { syncSchoolBookingsToCalendar } from "@/lib/school-calendar-sync";

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

const DEFAULT_LOOKAHEAD_DAYS = 14;

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

  const isOrgAdmin = isOrgWideAdmin(caller);
  const hasSchoolAccess = isOrgAdmin || caller.schoolId === schoolId;
  if (!hasSchoolAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days"));
  const lookaheadDays =
    Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90
      ? daysParam
      : DEFAULT_LOOKAHEAD_DAYS;

  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart.getTime() + lookaheadDays * 86_400_000);

  const slots = await prisma.schoolScheduleSlot.findMany({
    where: { schoolId, active: true, assignedTeacherMembershipId: { not: null } },
    select: {
      id: true,
      dayOfWeek: true,
      startMin: true,
      endMin: true,
      durationMin: true,
      timezone: true,
      assignedTeacherMembershipId: true,
      skips: { select: { startsAtIso: true } },
    },
  });

  let materializedAny = false;
  for (const slot of slots) {
    const existing = await prisma.schoolBooking.findMany({
      where: {
        scheduleSlotId: slot.id,
        startsAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { startsAt: true },
    });
    const existingIso = existing.map((b) => ({
      startsAtIso: b.startsAt.toISOString(),
    }));
    const plans = planMaterializedBookings(slot, existingIso, rangeStart, rangeEnd);
    if (plans.length === 0) continue;
    await prisma.schoolBooking.createMany({
      data: plans.map((p) => ({
        schoolId,
        scheduleSlotId: slot.id,
        teacherMembershipId: slot.assignedTeacherMembershipId!,
        startsAt: new Date(p.startsAtIso),
        endsAt: new Date(p.endsAtIso),
      })),
      skipDuplicates: true,
    });
    materializedAny = true;
  }

  if (materializedAny) {
    await syncSchoolBookingsToCalendar(schoolId, rangeStart, rangeEnd);
  }

  const classes = await prisma.schoolBooking.findMany({
    where: {
      schoolId,
      startsAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      scheduleSlot: {
        select: {
          lessonLevel: true,
          lessonType: true,
          labelJa: true,
          labelEn: true,
          capacity: true,
        },
      },
      teacherMembership: {
        select: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      attendees: {
        select: { id: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ classes });
}
