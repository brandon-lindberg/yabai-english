import type { PrismaClient } from "@prisma/client";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";

type TeacherScheduleBooking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  lessonProduct: {
    nameJa: string;
    nameEn: string;
  };
  student: {
    name: string | null;
    email: string | null;
  };
};

export function buildTeacherScheduleItems(bookings: TeacherScheduleBooking[]) {
  return bookings.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    title: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
    teacherName: b.student.name ?? b.student.email ?? "",
  }));
}

export async function getTeacherBookingsForDashboard(prisma: PrismaClient, teacherProfileId: string) {
  const bookings = await prisma.booking.findMany({
    where: { teacherId: teacherProfileId },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      student: true,
      invoice: true,
    },
  });

  const now = new Date();
  const { upcoming, completed } = groupBookingsForDashboard(bookings, now);
  const scheduleItems = buildTeacherScheduleItems(upcoming);

  return { bookings, upcoming, completed, scheduleItems };
}
