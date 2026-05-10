import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateSchoolBookingRescheduleTimes } from "@/lib/school-booking-reschedule-policy";
import { canDirectRescheduleSchoolClassBooking } from "@/lib/school-booking-reschedule-authorization";
import {
  applySchoolBookingReschedule,
  getSchoolBookingRescheduleConflictError,
  type SchoolBookingReschedulePayload,
} from "@/lib/school-booking-reschedule-apply";
import type { MembershipForAuth } from "@/lib/org-authorization";

const patchBodySchema = z.object({
  startsAt: z.string().datetime(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; bookingId: string }>;
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

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, bookingId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const newStart = new Date(parsed.data.startsAt);

  const booking = await prisma.schoolBooking.findUnique({
    where: { id: bookingId },
    include: {
      school: { select: { name: true } },
      teacherMembership: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, email: true } },
        },
      },
      attendees: {
        select: {
          studentMembership: {
            select: { userId: true, user: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!booking || booking.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canDirectRescheduleSchoolClassBooking(caller, schoolId)) {
    return NextResponse.json(
      {
        error:
          "Only school administrators can reschedule directly. Teachers should submit a reschedule request.",
      },
      { status: 403 },
    );
  }

  const organizerUserId = booking.teacherMembership.user?.id;
  if (!organizerUserId) {
    return NextResponse.json(
      { error: "Teacher account is not linked for this class." },
      { status: 409 },
    );
  }

  const timeCheck = evaluateSchoolBookingRescheduleTimes({
    previousStartsAt: booking.startsAt,
    newStartsAt: newStart,
  });
  if (!timeCheck.ok) {
    return NextResponse.json(
      { error: "New class time must be in the future.", code: timeCheck.reason },
      { status: 409 },
    );
  }

  const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (timeCheck.unchanged) {
    return NextResponse.json({
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      calendarUpdated: true,
    });
  }

  const conflictMsg = await getSchoolBookingRescheduleConflictError(
    booking,
    newStart,
    newEnd,
    organizerUserId,
  );
  if (conflictMsg) {
    return NextResponse.json({ error: conflictMsg }, { status: 409 });
  }

  try {
    const { calendarUpdated } = await applySchoolBookingReschedule({
      booking: booking as SchoolBookingReschedulePayload,
      newStart,
      newEnd,
      orgId,
      schoolId,
    });
    return NextResponse.json({
      id: booking.id,
      startsAt: newStart.toISOString(),
      endsAt: newEnd.toISOString(),
      calendarUpdated,
    });
  } catch (e) {
    if (String((e as Error).message) === "MISSING_TEACHER_USER") {
      return NextResponse.json(
        { error: "Teacher account is not linked for this class." },
        { status: 409 },
      );
    }
    throw e;
  }
}
