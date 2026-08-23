import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveBookingNotesLink } from "@/lib/google/meeting-notes-link";

type Props = { params: Promise<{ bookingId: string }> };

/**
 * Pulls the Gemini meeting-notes document off the lesson's Calendar event and
 * stores it as the booking's transcript link.
 *
 * Driven by both entry points on the completed-lesson panel: automatically when
 * the teacher opens a lesson whose link is still empty, and by the explicit
 * "fetch" button when the automatic pass came up empty — Gemini can take a few
 * minutes to publish, so a retry has to be available.
 */
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, teacher: { select: { userId: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The teacher who taught it, or an admin. A student must never be able to
  // drive a Calendar read against the teacher's account.
  const isOwner = booking.teacher.userId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outcome = await resolveBookingNotesLink(prisma, { bookingId });
  return NextResponse.json(outcome);
}
