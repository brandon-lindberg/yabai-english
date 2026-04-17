import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import { deriveMissingOfferingsFromSchedule } from "@/lib/schedule-offering-sync";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";

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
          lessonLevel: true,
          lessonType: true,
          lessonTypeCustom: true,
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
  await prisma.teacherProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  const profileSnapshot = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      rateYen: true,
      lessonOfferings: {
        select: {
          lessonType: true,
          lessonTypeCustom: true,
          active: true,
          rateYen: true,
          isGroup: true,
          durationMin: true,
        },
      },
    },
  });

  if (!profileSnapshot) {
    return NextResponse.json({ error: "Teacher profile missing" }, { status: 500 });
  }

  const newOfferings = deriveMissingOfferingsFromSchedule({
    existing: profileSnapshot.lessonOfferings,
    scheduled: parsed.data.map((slot) => ({
      lessonType: slot.lessonType,
      lessonTypeCustom:
        slot.lessonType === "custom" ? (slot.lessonTypeCustom?.trim() ?? null) : null,
    })),
    fallbackRateYen: profileSnapshot.rateYen ?? null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.availabilitySlot.deleteMany({ where: { teacherId: profileSnapshot.id } });
    if (parsed.data.length > 0) {
      await tx.availabilitySlot.createMany({
        data: parsed.data.map((slot) => ({
          teacherId: profileSnapshot.id,
          dayOfWeek: slot.dayOfWeek,
          startMin: slot.startMin,
          endMin: slot.endMin,
          timezone: slot.timezone,
          lessonLevel: slot.lessonLevel,
          lessonType: slot.lessonType,
          lessonTypeCustom:
            slot.lessonType === "custom" ? (slot.lessonTypeCustom?.trim() ?? null) : null,
          active: true,
        })),
      });
    }
    if (newOfferings.length > 0) {
      await tx.teacherLessonOffering.createMany({
        data: newOfferings.map((o) => ({
          teacherId: profileSnapshot.id,
          durationMin: o.durationMin,
          rateYen: o.rateYen,
          isGroup: o.isGroup,
          groupSize: o.groupSize,
          active: o.active,
          lessonType: o.lessonType,
          lessonTypeCustom: o.lessonTypeCustom,
        })),
      });
    }
    // Make sure every offering (existing + just-created) has a matching
    // LessonProduct row so students can actually see/book it.
    const offeringsForCatalog = [
      ...profileSnapshot.lessonOfferings.map((o) => ({
        lessonType: o.lessonType,
        durationMin: o.durationMin,
        active: o.active,
      })),
      ...newOfferings.map((o) => ({
        lessonType: o.lessonType,
        durationMin: o.durationMin,
        active: o.active,
      })),
    ];
    await ensureCatalogProductsForOfferings(tx, offeringsForCatalog);
  });

  return NextResponse.json({ ok: true });
}
