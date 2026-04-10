import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/calendar";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      studentId: session.user.id,
      ...(bookingId ? { id: bookingId } : { endsAt: { gte: now } }),
      status: { in: ["CONFIRMED", "PENDING_PAYMENT", "COMPLETED"] },
    },
    include: {
      teacher: { include: { user: true } },
      lessonProduct: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const events = bookings.map((booking) => ({
    uid: `booking-${booking.id}@english-studio.local`,
    title: `${booking.lessonProduct.nameEn} (${booking.lessonProduct.nameJa})`,
    description: `Teacher: ${booking.teacher.user.name ?? booking.teacher.user.email}`,
    location: booking.meetUrl ?? "English Studio lesson",
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
  }));

  const ics = buildIcs(events);
  const filename = bookingId ? `lesson-${bookingId}.ics` : "english-studio-schedule.ics";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
