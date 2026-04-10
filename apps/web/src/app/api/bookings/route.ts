import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";

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

  if (student.studentProfile.lessonCredits < product.creditCost) {
    return NextResponse.json(
      { error: "Not enough credits", need: product.creditCost },
      { status: 402 },
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
    if (!profile || profile.lessonCredits < product.creditCost) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    const newBal = profile.lessonCredits - product.creditCost;
    await tx.studentProfile.update({
      where: { userId: session.user.id },
      data: { lessonCredits: newBal },
    });
    await tx.creditTransaction.create({
      data: {
        userId: session.user.id,
        type: "LESSON_DEBIT",
        amount: -product.creditCost,
        balanceAfter: newBal,
        description: `Booking ${product.nameEn}`,
      },
    });
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
    if (String(e.message) === "INSUFFICIENT_CREDITS") return null;
    throw e;
  });

  if (!booking) {
    return NextResponse.json({ error: "Not enough credits" }, { status: 402 });
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
      where: { id: booking.id },
      data: {
        meetUrl: meet.meetUrl,
        googleEventId: meet.googleEventId,
      },
    });
  }

  const fresh = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { lessonProduct: true, teacher: { include: { user: true } } },
  });

  return NextResponse.json(fresh ?? booking);
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
