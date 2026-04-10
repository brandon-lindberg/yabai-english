import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { z } from "zod";
import { BookingStatus, LessonTier } from "@prisma/client";

const postSchema = z.object({
  lessonProductId: z.string().min(1),
  teacherProfileId: z.string().min(1).optional(),
  startsAt: z.string().datetime(),
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

  const { lessonProductId, teacherProfileId, startsAt } = parsed.data;
  const start = new Date(startsAt);

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
      { error: "That time conflicts with another booking." },
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

  const booking = await prisma.$transaction(async (tx) => {
    const profile = await tx.studentProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      throw new Error("NO_PROFILE");
    }

    if (isFreeTrial) {
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
          status: BookingStatus.CONFIRMED,
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
        status: BookingStatus.CONFIRMED,
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
    });
    const list = await prisma.booking.findMany({
      where: teacher ? { teacherId: teacher.id } : {},
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
