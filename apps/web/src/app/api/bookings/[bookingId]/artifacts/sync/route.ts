import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetingSummaryDoc, syncMeetingArtifacts } from "@/lib/google/post-meeting";

type Props = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      teacher: { include: { user: true } },
      student: true,
      lessonProduct: true,
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const artifacts = await syncMeetingArtifacts({
    organizerUserId: booking.teacher.userId,
    bookingId: booking.id,
  });

  const studentArtifacts = await syncMeetingArtifacts({
    organizerUserId: booking.studentId,
    bookingId: booking.id,
  });

  const teacherDocId = await createMeetingSummaryDoc({
    organizerUserId: booking.teacher.userId,
    title: `Lesson notes: ${booking.lessonProduct.nameEn}`,
    summary: `Lesson summary for booking ${booking.id}\n\nStart: ${booking.startsAt.toISOString()}\nEnd: ${booking.endsAt.toISOString()}`,
    attendeeEmails: [booking.student.email, booking.teacher.user.email].filter(Boolean) as string[],
  });

  const studentDocId = await createMeetingSummaryDoc({
    organizerUserId: booking.studentId,
    title: `Lesson notes: ${booking.lessonProduct.nameEn}`,
    summary: `Lesson summary for booking ${booking.id}\n\nStart: ${booking.startsAt.toISOString()}\nEnd: ${booking.endsAt.toISOString()}`,
    attendeeEmails: [booking.student.email, booking.teacher.user.email].filter(Boolean) as string[],
  });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      notesDocId: teacherDocId ?? studentDocId ?? booking.notesDocId,
      transcriptArtifactIds: Array.from(
        new Set([...artifacts.transcriptArtifactIds, ...studentArtifacts.transcriptArtifactIds]),
      ),
      smartNotesIds: Array.from(
        new Set([...artifacts.smartNotesIds, ...studentArtifacts.smartNotesIds]),
      ),
      recordingIds: Array.from(
        new Set([...artifacts.recordingIds, ...studentArtifacts.recordingIds]),
      ),
    },
  });

  return NextResponse.json({ booking: updated });
}
