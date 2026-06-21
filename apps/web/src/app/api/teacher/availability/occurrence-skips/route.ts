import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";

const bodySchema = z.object({
  slotId: z.string().min(1),
  startsAtIso: z.string().min(10),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { slotId, startsAtIso } = parsed.data;

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      availabilitySlots: {
        where: { active: true },
        select: {
          id: true,
          dayOfWeek: true,
          startMin: true,
          endMin: true,
          timezone: true,
          recurrence: true,
          startsOn: true,
          endsOn: true,
          classLevelId: true,
          classTypeId: true,
        },
      },
    },
  });

  if (!profile?.id) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const viewerTz = profile.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";
  const options = buildUpcomingSlotOptions({
    availabilitySlots: profile.availabilitySlots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startMin: s.startMin,
      endMin: s.endMin,
      timezone: s.timezone,
      recurrence: s.recurrence,
      startsOn: dateOnlyInZone(s.startsOn, s.timezone),
      endsOn: dateOnlyInZone(s.endsOn, s.timezone),
      classLevelId: s.classLevelId,
      classTypeId: s.classTypeId,
    })),
    viewerTimezone: viewerTz,
    horizonDays: 400,
    allowPastInstances: true,
  });

  const match = options.some((o) => o.slotId === slotId && o.startsAtIso === startsAtIso);
  if (!match) {
    return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });
  }

  try {
    await prisma.availabilityOccurrenceSkip.create({
      data: {
        teacherProfileId: profile.id,
        startsAtIso,
      },
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== "P2002") throw e;
  }

  return NextResponse.json({ ok: true });
}
