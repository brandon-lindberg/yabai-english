import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          startMin: true,
          endMin: true,
          timezone: true,
          active: true,
        },
      },
      availabilityOccurrenceSkips: {
        select: { startsAtIso: true },
      },
    },
  });

  return NextResponse.json({
    teacherProfileId: profile?.id ?? null,
    slots: profile?.availabilitySlots ?? [],
    occurrenceSkips: profile?.availabilityOccurrenceSkips?.map((s) => s.startsAtIso) ?? [],
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = teacherAvailabilitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session.user.id;
  const profile = await prisma.teacherProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.availabilitySlot.deleteMany({ where: { teacherId: profile.id } });
    if (parsed.data.length > 0) {
      await tx.availabilitySlot.createMany({
        data: parsed.data.map((slot) => ({
          teacherId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          startMin: slot.startMin,
          endMin: slot.endMin,
          timezone: slot.timezone,
          active: true,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
