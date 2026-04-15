import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { normalizeBookingCompletionNotesPatch } from "@/lib/booking-completion-notes";

type Props = {
  params: Promise<{ bookingId: string }>;
};

function canTeacherEditBooking(teacherUserId: string, sessionUserId: string, role: string) {
  return role === "TEACHER" && teacherUserId === sessionUserId;
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = normalizeBookingCompletionNotesPatch(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      teacherId: true,
      studentId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      teacher: { select: { userId: true } },
    },
  });

  if (!booking || booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  if (booking.endsAt > now) {
    return NextResponse.json({ error: "Lesson has not ended yet" }, { status: 409 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isTeacher = canTeacherEditBooking(booking.teacher.userId, session.user.id, session.user.role);
  if (!isTeacher && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { completionNotesMd, externalTranscriptUrl } = parsed.data;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      ...(completionNotesMd !== undefined ? { completionNotesMd } : {}),
      ...(externalTranscriptUrl !== undefined ? { externalTranscriptUrl } : {}),
    },
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule/completed`);
  }

  return NextResponse.json({ ok: true });
}
