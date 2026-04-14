import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { buildInvoiceNumber } from "@/lib/invoices";
import { getBookingPaymentFlow } from "@/lib/payment-flow";
import { createUserNotification } from "@/lib/notifications";
import { ensureStudentTeacherThread } from "@/lib/chat-threads";
import {
  canBypassLeadTimeWindow,
  isBookingOutsideLeadWindow,
} from "@/lib/lead-time-policy";
import { validateManualOverrideReason } from "@/lib/manual-override";
import { z } from "zod";
import { BookingStatus, LessonTier } from "@prisma/client";

const postSchema = z.object({
  lessonProductId: z.string().min(1),
  teacherProfileId: z.string().min(1).optional(),
  startsAt: z.string().datetime(),
  manualOverride: z.boolean().optional(),
  manualOverrideReason: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    lessonProductId,
    teacherProfileId,
    startsAt,
    manualOverride,
    manualOverrideReason,
  } = parsed.data;
  const start = new Date(startsAt);
  const outsideLeadWindow = isBookingOutsideLeadWindow({
    start,
    minimumHours: 48,
  });
  const canBypass = canBypassLeadTimeWindow(
    session.user.role,
    Boolean(manualOverride),
  );
  const reasonCheck = validateManualOverrideReason(
    Boolean(manualOverride) && canBypass,
    manualOverrideReason ?? "",
  );
  if (!reasonCheck.ok) {
    return NextResponse.json(
      { error: "Manual override reason is required." },
      { status: 400 },
    );
  }
  if (!outsideLeadWindow && !canBypass) {
    return NextResponse.json(
      { error: "Bookings must be made at least 48 hours in advance." },
      { status: 409 },
    );
  }

  const product = await prisma.lessonProduct.findFirst({
    where: { id: lessonProductId, active: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Lesson type not found" }, {
      status: 404,
    });
  }

  const teacher =
    (teacherProfileId
      ? await prisma.teacherProfile.findFirst({
          where: { id: teacherProfileId },
          include: { user: true },
        })
      : null) ??
    (await prisma.teacherProfile.findFirst({
      include: { user: true },
    }));

  if (!teacher) {
    return NextResponse.json(
      { error: "No teacher available. Ask an admin to add a teacher profile." },
      { status: 409 },
    );
  }

  const blockedThread = await prisma.chatThread.findUnique({
    where: {
      studentId_teacherId: {
        studentId: session.user.id,
        teacherId: teacher.userId,
      },
    },
    select: {
      studentBlockedAt: true,
      teacherBlockedAt: true,
    },
  });
  if (blockedThread?.studentBlockedAt || blockedThread?.teacherBlockedAt) {
    return NextResponse.json(
      { error: "This teacher is not available for booking." },
      { status: 403 },
    );
  }

  const endsAt = new Date(start.getTime() + product.durationMin * 60_000);

  const conflict = await prisma.booking.findFirst({
    where: {
      teacherId: teacher.id,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
      startsAt: { lt: endsAt },
      endsAt: { gt: start },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "That slot was just booked by another student." },
      { status: 409 },
    );
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { studentProfile: true },
  });
  if (!student?.studentProfile) {
    return NextResponse.json({ error: "No student profile" }, { status: 400 });
  }

  const isFreeTrial = product.tier === LessonTier.FREE_TRIAL;
  const quotedPriceYen = isFreeTrial ? 0 : (teacher.rateYen ?? 3000);

  if (isFreeTrial && student.studentProfile.trialLessonUsedAt) {
    return NextResponse.json(
      { error: "Free trial lesson already used" },
      { status: 409 },
    );
  }

  const attendeeEmails = [
    student.email,
    teacher.user.email,
  ].filter(Boolean) as string[];

  const flow = getBookingPaymentFlow({
    lessonTier: product.tier,
    trialAlreadyUsed: Boolean(student.studentProfile.trialLessonUsedAt),
  });

  const booking = await prisma.$transaction(async (tx) => {
    const profile = await tx.studentProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      throw new Error("NO_PROFILE");
    }

    if (!flow.requiresPayment) {
      const claimed = await tx.studentProfile.updateMany({
        where: { userId: session.user.id, trialLessonUsedAt: null },
        data: { trialLessonUsedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new Error("TRIAL_USED");
      }
      return tx.booking.create({
        data: {
          studentId: session.user.id,
          teacherId: teacher.id,
          lessonProductId: product.id,
          startsAt: start,
          endsAt,
          status: flow.status,
          quotedPriceYen,
          manualOverrideUsed: !outsideLeadWindow && canBypass,
          manualOverrideReason: !outsideLeadWindow && canBypass ? reasonCheck.normalizedReason : null,
          manualOverrideByRole: !outsideLeadWindow && canBypass ? session.user.role : null,
        },
        include: { lessonProduct: true, teacher: { include: { user: true } } },
      });
    }

    return tx.booking.create({
      data: {
        studentId: session.user.id,
        teacherId: teacher.id,
        lessonProductId: product.id,
        startsAt: start,
        endsAt,
        status: flow.status,
        quotedPriceYen,
        manualOverrideUsed: !outsideLeadWindow && canBypass,
        manualOverrideReason: !outsideLeadWindow && canBypass ? reasonCheck.normalizedReason : null,
        manualOverrideByRole: !outsideLeadWindow && canBypass ? session.user.role : null,
      },
      include: { lessonProduct: true, teacher: { include: { user: true } } },
    });
  }).catch((e) => {
    const msg = String((e as Error).message);
    if (msg === "TRIAL_USED" || msg === "NO_PROFILE") {
      return { _err: msg } as const;
    }
    throw e;
  });

  if (booking && typeof booking === "object" && "_err" in booking) {
    const code = (booking as { _err: string })._err;
    if (code === "TRIAL_USED") {
      return NextResponse.json(
        { error: "Free trial lesson already used" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "No student profile" }, { status: 400 });
  }

  const confirmedBooking = booking as Exclude<typeof booking, { _err: string }>;

  if (confirmedBooking.status === BookingStatus.PENDING_PAYMENT) {
    await createUserNotification({
      userId: session.user.id,
      titleJa: "支払い待ちの予約があります",
      titleEn: "Booking pending payment",
      bodyJa: "予約を確定するには支払いを完了してください。",
      bodyEn: "Complete payment to confirm your booking.",
    });
    return NextResponse.json({
      bookingId: confirmedBooking.id,
      requiresPayment: true,
      checkoutUrl: `/book/checkout/${confirmedBooking.id}`,
    });
  }

  const meet = await createMeetLessonEvent({
    refreshTokenEncrypted: teacher.googleCalendarRefreshToken,
    calendarId: teacher.calendarId,
    summary: `Lesson — ${product.nameEn}`,
    start,
    end: endsAt,
    attendeeEmails,
  });

  if (meet.meetUrl || meet.googleEventId) {
    await prisma.booking.update({
      where: { id: confirmedBooking.id },
      data: {
        meetUrl: meet.meetUrl,
        googleEventId: meet.googleEventId,
      },
    });
  }

  const fresh = await prisma.booking.findUnique({
    where: { id: confirmedBooking.id },
    include: { lessonProduct: true, teacher: { include: { user: true } } },
  });

  const now = new Date();
  await prisma.invoice.upsert({
    where: { bookingId: confirmedBooking.id },
    create: {
      bookingId: confirmedBooking.id,
      studentId: session.user.id,
      amountYen: confirmedBooking.quotedPriceYen,
      invoiceNo: buildInvoiceNumber(now),
      paidAt: now,
    },
    update: {
      amountYen: confirmedBooking.quotedPriceYen,
      paidAt: now,
    },
  });

  await ensureStudentTeacherThread(session.user.id, teacher.userId);
  await createUserNotification({
    userId: session.user.id,
    titleJa: "予約が確定しました",
    titleEn: "Booking confirmed",
    bodyJa: `${product.nameJa} の予約が確定しました。`,
    bodyEn: `Your ${product.nameEn} booking is confirmed.`,
  });

  return NextResponse.json(fresh ?? confirmedBooking);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "STUDENT") {
    const list = await prisma.booking.findMany({
      where: { studentId: session.user.id },
      orderBy: { startsAt: "asc" },
      include: {
        lessonProduct: true,
        teacher: { include: { user: true } },
      },
    });
    return NextResponse.json(list);
  }

  if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true, userId: true },
    });
    const list = await prisma.booking.findMany({
      where: teacher
        ? {
            teacherId: teacher.id,
            student: {
              chatThreadsAsStudent: {
                none: {
                  teacherId: teacher.userId,
                  studentBlockedAt: { not: null },
                },
              },
            },
          }
        : {},
      orderBy: { startsAt: "asc" },
      include: {
        lessonProduct: true,
        student: true,
        teacher: { include: { user: true } },
      },
    });
    return NextResponse.json(list);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
