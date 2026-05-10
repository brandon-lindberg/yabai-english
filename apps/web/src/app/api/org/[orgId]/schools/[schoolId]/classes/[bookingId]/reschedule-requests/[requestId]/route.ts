import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SchoolBookingRescheduleRequestStatus } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/notifications";
import { schoolClassRescheduleRequestRejectedForTeacher } from "@/lib/reschedule-notification-copy";
import { evaluateSchoolBookingRescheduleTimes } from "@/lib/school-booking-reschedule-policy";
import { canDirectRescheduleSchoolClassBooking } from "@/lib/school-booking-reschedule-authorization";
import {
  applySchoolBookingReschedule,
  getSchoolBookingRescheduleConflictError,
  type SchoolBookingReschedulePayload,
} from "@/lib/school-booking-reschedule-apply";
import type { MembershipForAuth } from "@/lib/org-authorization";

const patchBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectReason: z.string().max(500).optional(),
});

type RouteContext = {
  params: Promise<{
    orgId: string;
    schoolId: string;
    bookingId: string;
    requestId: string;
  }>;
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

  const { orgId, schoolId, bookingId, requestId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const request = await prisma.schoolBookingRescheduleRequest.findFirst({
    where: {
      id: requestId,
      schoolBookingId: bookingId,
      schoolBooking: { schoolId },
    },
    include: {
      requesterMembership: { select: { userId: true } },
      schoolBooking: {
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
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (!caller || !canDirectRescheduleSchoolClassBooking(caller, schoolId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.status !== SchoolBookingRescheduleRequestStatus.PENDING) {
    return NextResponse.json(
      { error: "This request has already been processed." },
      { status: 409 },
    );
  }

  const booking = request.schoolBooking;
  const schoolName = booking.school?.name ?? "School";

  if (parsed.data.action === "reject") {
    await prisma.schoolBookingRescheduleRequest.update({
      where: { id: request.id },
      data: {
        status: SchoolBookingRescheduleRequestStatus.REJECTED,
        reviewedByMembershipId: caller.id,
        reviewedAt: new Date(),
        rejectReason: parsed.data.rejectReason ?? null,
      },
    });
    const teacherUserId = request.requesterMembership.userId;
    if (teacherUserId) {
      const copy = schoolClassRescheduleRequestRejectedForTeacher({
        schoolName,
        rejectReason: parsed.data.rejectReason,
      });
      await createUserNotification({
        userId: teacherUserId,
        ...copy,
      });
    }
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const newStart = request.proposedStartsAt;
  const newEnd = request.proposedEndsAt;
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
      {
        error:
          "The proposed time is no longer valid (for example it is now in the past). Ask the teacher to submit a new request.",
        code: timeCheck.reason,
      },
      { status: 409 },
    );
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
    await applySchoolBookingReschedule({
      booking: booking as SchoolBookingReschedulePayload,
      newStart,
      newEnd,
      orgId,
      schoolId,
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

  await prisma.schoolBookingRescheduleRequest.update({
    where: { id: request.id },
    data: {
      status: SchoolBookingRescheduleRequestStatus.APPROVED,
      reviewedByMembershipId: caller.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    booking: {
      id: booking.id,
      startsAt: newStart.toISOString(),
      endsAt: newEnd.toISOString(),
    },
  });
}
