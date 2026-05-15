import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { notifyBookingCalendarInviteFailure } from "@/lib/booking-calendar-failure";
import { buildInvoiceNumber } from "@/lib/invoices";
import { getBookingPaymentFlow } from "@/lib/payment-flow";
import { createUserNotification } from "@/lib/notifications";
import { ensureStudentTeacherThread } from "@/lib/chat-threads";
import {
  canBypassLeadTimeWindow,
  isBookingOutsideLeadWindow,
} from "@/lib/lead-time-policy";
import { validateManualOverrideReason } from "@/lib/manual-override";
import {
  catalogProductMatchesOffering,
  canTeacherOfferProduct,
  teacherHasOfferingForProduct,
} from "@/lib/lesson-products";
import { resolveQuotedPriceYen } from "@/lib/booking-price-resolution";
import { bookingStartMatchesTeacherAvailability } from "@/lib/booking-availability-match";
import { buildTeacherBookingConfirmedNotification } from "@/lib/booking-notifications";
import { findOccurrenceConflict } from "@/lib/school-scheduling";
import { z } from "zod";
import { BookingStatus, LessonTier } from "@/generated/prisma/client";
import { studentMayAccessTeacherBookingFlow } from "@/lib/teacher-marketplace-booking-access";
import { revalidateDashboardStudentRosterPaths } from "@/lib/revalidate-dashboard-roster";
import { syncTeacherRosterAfterStudentBooking } from "@/lib/sync-teacher-roster-after-student-booking";
import { getEnabledTeacherPaymentMethods } from "@/lib/payment-methods";

const postSchema = z.object({
  lessonProductId: z.string().min(1),
  teacherProfileId: z.string().min(1).optional(),
  teacherLessonOfferingId: z.string().min(1).optional(),
  paymentAccountId: z.string().min(1).optional(),
  paymentProvider: z.enum(["STRIPE", "KOMOJU"]).optional(),
  paymentMethod: z.enum(["CARD", "PAYPAY"]).optional(),
  startsAt: z.string().datetime(),
  manualOverride: z.boolean().optional(),
  manualOverrideReason: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    lessonProductId,
    teacherProfileId,
    teacherLessonOfferingId,
    startsAt,
    paymentAccountId,
    paymentProvider,
    paymentMethod,
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
          include: {
            user: {
              include: {
                organizationMemberships: {
                  where: { status: "ACTIVE" },
                  select: { id: true },
                  take: 1,
                },
              },
            },
            lessonOfferings: { include: { classType: true } },
            paymentAccounts: {
              select: {
                id: true,
                provider: true,
                status: true,
                chargesEnabled: true,
                payoutsEnabled: true,
                methods: { select: { method: true, enabled: true } },
              },
            },
            availabilitySlots: {
              where: { active: true },
              select: {
                dayOfWeek: true,
                startMin: true,
                endMin: true,
                timezone: true,
                recurrence: true,
                startsOn: true,
                endsOn: true,
                classTypeId: true,
                teacherLessonOfferingId: true,
              },
            },
            availabilityOccurrenceSkips: {
              select: { startsAtIso: true },
            },
          },
        })
      : null) ??
    (await prisma.teacherProfile.findFirst({
      include: {
        user: {
          include: {
            organizationMemberships: {
              where: { status: "ACTIVE" },
              select: { id: true },
              take: 1,
            },
          },
        },
        lessonOfferings: { include: { classType: true } },
        paymentAccounts: {
          select: {
            id: true,
            provider: true,
            status: true,
            chargesEnabled: true,
            payoutsEnabled: true,
            methods: { select: { method: true, enabled: true } },
          },
        },
        availabilitySlots: {
          where: { active: true },
          select: {
            dayOfWeek: true,
            startMin: true,
            endMin: true,
            timezone: true,
            recurrence: true,
            startsOn: true,
            endsOn: true,
            classTypeId: true,
            teacherLessonOfferingId: true,
          },
        },
        availabilityOccurrenceSkips: {
          select: { startsAtIso: true },
        },
      },
    }));

  if (!teacher) {
    return NextResponse.json(
      { error: "No teacher available. Ask an admin to add a teacher profile." },
      { status: 409 },
    );
  }

  if (teacher.user.organizationMemberships.length > 0) {
    return NextResponse.json(
      { error: "This teacher is not available for marketplace booking." },
      { status: 403 },
    );
  }

  const onRoster = await prisma.teacherRosterEntry.findFirst({
    where: { teacherId: teacher.id, studentId: session.user.id },
    select: { id: true },
  });
  if (
    !studentMayAccessTeacherBookingFlow({
      marketplaceHidden: teacher.marketplaceHidden,
      viewerStudentId: session.user.id,
      isStudentOnRoster: Boolean(onRoster),
    })
  ) {
    return NextResponse.json(
      { error: "This teacher is not available for booking." },
      { status: 403 },
    );
  }

  if (!canTeacherOfferProduct(product.tier, teacher.offersFreeTrial)) {
    return NextResponse.json(
      { error: "This teacher does not offer a free trial lesson." },
      { status: 409 },
    );
  }

  const selectedOffering = teacherLessonOfferingId
    ? teacher.lessonOfferings.find(
        (o) =>
          o.id === teacherLessonOfferingId &&
          o.active,
      )
    : null;

  if (selectedOffering && !catalogProductMatchesOffering(product, selectedOffering)) {
    return NextResponse.json(
      { error: "This teacher does not offer this lesson type." },
      { status: 409 },
    );
  }

  if (!selectedOffering && !teacherHasOfferingForProduct(teacher.lessonOfferings, product)) {
    return NextResponse.json(
      { error: "This teacher does not offer this lesson type." },
      { status: 409 },
    );
  }

  if (
    Array.isArray(teacher.availabilitySlots) &&
    !bookingStartMatchesTeacherAvailability({
      availabilitySlots: teacher.availabilitySlots,
      startsAt: start,
      durationMin: product.durationMin,
      selectedOffering: selectedOffering
        ? {
            id: selectedOffering.id,
            durationMin: selectedOffering.durationMin,
            classTypeId: selectedOffering.classTypeId,
          }
        : null,
      skippedStartsAtIso: new Set(
        (teacher.availabilityOccurrenceSkips ?? []).map((skip) => skip.startsAtIso),
      ),
    })
  ) {
    return NextResponse.json(
      { error: "Selected time is no longer available." },
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

  const teacherSchoolSlots = await prisma.schoolScheduleSlot.findMany({
    where: {
      active: true,
      assignedTeacher: {
        userId: teacher.userId,
        status: "ACTIVE",
      },
    },
    select: {
      dayOfWeek: true,
      startMin: true,
      endMin: true,
      timezone: true,
      skips: { select: { startsAtIso: true } },
    },
  });
  if (teacherSchoolSlots.length > 0) {
    const schoolConflict = findOccurrenceConflict(
      teacherSchoolSlots,
      start,
      endsAt,
    );
    if (schoolConflict) {
      return NextResponse.json(
        { error: "The teacher is teaching a school class during that time." },
        { status: 409 },
      );
    }
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { studentProfile: true },
  });
  if (!student?.studentProfile) {
    return NextResponse.json({ error: "No student profile" }, { status: 400 });
  }

  const isFreeTrial = product.tier === LessonTier.FREE_TRIAL;
  const studentOverride = selectedOffering
    ? await prisma.teacherStudentLessonRate.findUnique({
        where: {
          teacherLessonOfferingId_studentId: {
            teacherLessonOfferingId: selectedOffering.id,
            studentId: session.user.id,
          },
        },
        select: { rateYen: true, active: true },
      })
    : null;
  const quotedPriceYen = resolveQuotedPriceYen({
    product,
    selectedOffering: selectedOffering ?? null,
    offerings: teacher.lessonOfferings,
    fallbackRateYen: teacher.rateYen ?? 3000,
    studentOverride: studentOverride?.active ? studentOverride : null,
  });

  if (isFreeTrial && student.studentProfile.trialLessonUsedAt) {
    return NextResponse.json(
      { error: "Free trial lesson already used" },
      { status: 409 },
    );
  }

  const teacherPaymentAccounts = (teacher as {
    paymentAccounts?: Parameters<typeof getEnabledTeacherPaymentMethods>[0];
  }).paymentAccounts;
  const teacherPaymentPolicyAccepted = teacherPaymentAccounts
    ? Boolean((teacher as { paymentPolicyAcceptedAt?: Date | null }).paymentPolicyAcceptedAt)
    : true;
  const enabledPaymentMethods = teacherPaymentAccounts
    ? teacherPaymentPolicyAccepted
      ? getEnabledTeacherPaymentMethods(teacherPaymentAccounts)
      : []
    : [
        {
          accountId: "",
          provider: "STRIPE" as const,
          method: "CARD" as const,
          label: "Credit card",
          logoLabel: "Stripe",
          logoClassName: "bg-[#635bff] text-white",
        },
      ];
  const selectedPaymentMethod = isFreeTrial
    ? null
    : enabledPaymentMethods.find((m) => {
        if (paymentAccountId && m.accountId !== paymentAccountId) return false;
        if (paymentProvider && m.provider !== paymentProvider) return false;
        if (paymentMethod && m.method !== paymentMethod) return false;
        return true;
      }) ?? enabledPaymentMethods[0] ?? null;

  if (!isFreeTrial && !selectedPaymentMethod) {
    return NextResponse.json(
      { error: "This teacher has not enabled payments yet." },
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

    // Only burn the free-trial flag for actual free-trial bookings. The
    // payment flow can also auto-confirm paid bookings (BOOKING_AUTO_CONFIRM
    // dev flag) — those must not consume the student's free-trial slot.
    if (product.tier === "FREE_TRIAL") {
      const claimed = await tx.studentProfile.updateMany({
        where: { userId: session.user.id, trialLessonUsedAt: null },
        data: { trialLessonUsedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new Error("TRIAL_USED");
      }
    }

    const created = await tx.booking.create({
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

    if (flow.requiresPayment && selectedPaymentMethod && "payment" in tx) {
      await tx.payment.create({
        data: {
          bookingId: created.id,
          studentId: session.user.id,
          teacherId: teacher.id,
          teacherPaymentAccountId: selectedPaymentMethod.accountId,
          provider: selectedPaymentMethod.provider,
          method: selectedPaymentMethod.method,
          amountYen: quotedPriceYen,
          currency: "JPY",
          status: "CREATED",
          idempotencyKey: `booking:${created.id}`,
          checkoutUrl: `/book/checkout/${created.id}`,
          ledgerEntries: {
            create: [
              { type: "GROSS", amountYen: quotedPriceYen },
              { type: "PLATFORM_FEE", amountYen: Math.floor(quotedPriceYen * 0.1) },
              { type: "TEACHER_NET", amountYen: quotedPriceYen - Math.floor(quotedPriceYen * 0.1) },
            ],
          },
        },
      });
    }

    await syncTeacherRosterAfterStudentBooking(tx, {
      teacherId: teacher.id,
      studentUserId: session.user.id,
    });

    return created;
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

  revalidateDashboardStudentRosterPaths();

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
    organizerUserId: teacher.userId,
    refreshTokenEncrypted: teacher.googleCalendarRefreshToken,
    calendarId: teacher.calendarId,
    summary: `Lesson — ${product.nameEn}`,
    start,
    end: endsAt,
    attendeeEmails,
  });

  if (meet.meetUrl || meet.googleEventId) {
    const meetCode = meet.meetUrl ? meet.meetUrl.split("/").pop() ?? null : null;
    await prisma.booking.update({
      where: { id: confirmedBooking.id },
      data: {
        meetUrl: meet.meetUrl,
        googleEventId: meet.googleEventId,
        googleCalendarId: teacher.calendarId ?? "primary",
        meetCode,
      },
    });
  } else if (meet.errorCode) {
    await notifyBookingCalendarInviteFailure({
      teacherUserId: teacher.userId,
      studentUserId: session.user.id,
      reason: meet.errorMessage,
    });
  }

  const studentMirrorEvent = await createMeetLessonEvent({
    organizerUserId: session.user.id,
    refreshTokenEncrypted: null,
    calendarId: "primary",
    summary: `Lesson — ${product.nameEn}`,
    start,
    end: endsAt,
    attendeeEmails,
    createMeetLink: false,
  });
  if (studentMirrorEvent.googleEventId) {
    await prisma.booking.update({
      where: { id: confirmedBooking.id },
      data: { studentGoogleEventId: studentMirrorEvent.googleEventId },
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

  const teacherTimezone = teacher.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";
  const teacherNotification = buildTeacherBookingConfirmedNotification({
    studentName: student.name ?? null,
    startsAt: start,
    timezone: teacherTimezone,
  });
  await createUserNotification({
    userId: teacher.userId,
    ...teacherNotification,
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

  if (session.user.role === "TEACHER" || session.user.role === "SUPER_ADMIN") {
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
