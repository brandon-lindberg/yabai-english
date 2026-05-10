import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SchoolBookingRescheduleRequestStatus } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/notifications";
import { schoolClassRescheduleRequestPendingForAdmins } from "@/lib/reschedule-notification-copy";
import { evaluateSchoolBookingRescheduleTimes } from "@/lib/school-booking-reschedule-policy";
import { canSubmitSchoolClassRescheduleRequest } from "@/lib/school-booking-reschedule-authorization";
import { getSchoolBookingRescheduleConflictError } from "@/lib/school-booking-reschedule-apply";
import type { MembershipForAuth } from "@/lib/org-authorization";

const postBodySchema = z.object({
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

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, bookingId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const newStart = new Date(parsed.data.startsAt);

  const booking = await prisma.schoolBooking.findUnique({
    where: { id: bookingId },
    include: {
      school: { select: { name: true, organizationId: true } },
      teacherMembership: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, email: true } },
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
  if (
    !canSubmitSchoolClassRescheduleRequest(
      caller,
      schoolId,
      booking.teacherMembershipId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Only the assigned teacher can submit a reschedule request. School admins reschedule directly.",
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

  if (timeCheck.unchanged) {
    return NextResponse.json(
      { error: "Proposed time is the same as the current schedule." },
      { status: 409 },
    );
  }

  const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  const conflictMsg = await getSchoolBookingRescheduleConflictError(
    booking,
    newStart,
    newEnd,
    organizerUserId,
  );
  if (conflictMsg) {
    return NextResponse.json({ error: conflictMsg }, { status: 409 });
  }

  const pending = await prisma.schoolBookingRescheduleRequest.findFirst({
    where: {
      schoolBookingId: booking.id,
      status: SchoolBookingRescheduleRequestStatus.PENDING,
    },
  });
  if (pending) {
    return NextResponse.json(
      { error: "A pending reschedule request already exists for this class." },
      { status: 409 },
    );
  }

  const created = await prisma.schoolBookingRescheduleRequest.create({
    data: {
      schoolBookingId: booking.id,
      requesterMembershipId: caller.id,
      proposedStartsAt: newStart,
      proposedEndsAt: newEnd,
      status: SchoolBookingRescheduleRequestStatus.PENDING,
    },
    select: {
      id: true,
      proposedStartsAt: true,
      proposedEndsAt: true,
      status: true,
    },
  });

  const schoolName = booking.school?.name ?? "School";
  const adminNotify = schoolClassRescheduleRequestPendingForAdmins({ schoolName });
  const adminRows = await prisma.organizationMembership.findMany({
    where: {
      organizationId: booking.school.organizationId,
      status: "ACTIVE",
      userId: { not: null },
      OR: [
        { orgRole: { in: ["OWNER", "ORG_ADMIN"] }, schoolId: null },
        { orgRole: "SCHOOL_ADMIN", schoolId },
      ],
    },
    select: { userId: true },
  });
  const adminUserIds = [
    ...new Set(
      adminRows.map((r) => r.userId).filter((id): id is string => Boolean(id)),
    ),
  ];
  await Promise.all(
    adminUserIds.map((userId) =>
      createUserNotification({
        userId,
        ...adminNotify,
      }),
    ),
  );

  return NextResponse.json(
    {
      request: {
        id: created.id,
        proposedStartsAt: created.proposedStartsAt.toISOString(),
        proposedEndsAt: created.proposedEndsAt.toISOString(),
        status: created.status,
      },
    },
    { status: 201 },
  );
}
