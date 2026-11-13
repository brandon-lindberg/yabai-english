import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureBookingCalendar } from "@/lib/booking-calendar-recovery";

type Props = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, teacher: { select: { userId: true } } } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.teacher.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { httpStatus, ...result } = await ensureBookingCalendar(bookingId);
  return NextResponse.json(result, { status: httpStatus });
}
