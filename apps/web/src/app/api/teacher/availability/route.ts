import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import { deriveMissingOfferingsFromSchedule } from "@/lib/schedule-offering-sync";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";
import { seedDefaultTeacherTaxonomy } from "@/lib/teacher-default-taxonomy";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
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
          classLevelId: true,
          classTypeId: true,
          classLevel: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          classType: { select: { id: true, code: true, labelEn: true, labelJa: true } },
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
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = teacherAvailabilitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session.user.id;
  const profileSnapshot = await prisma.teacherProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      id: true,
      rateYen: true,
      lessonOfferings: {
        select: {
          classTypeId: true,
          active: true,
          rateYen: true,
          isGroup: true,
          durationMin: true,
        },
      },
    },
  });

  // Defensively seed default taxonomy in case the teacher reached this PATCH
  // before the onboarding flow ran (e.g. legacy profile).
  await seedDefaultTeacherTaxonomy(prisma, profileSnapshot.id);

  // Validate that every classLevelId / classTypeId belongs to this teacher.
  const refLevelIds = Array.from(new Set(parsed.data.map((s) => s.classLevelId)));
  const refTypeIds = Array.from(new Set(parsed.data.map((s) => s.classTypeId)));
  const [foundLevels, foundTypes] = await Promise.all([
    prisma.teacherClassLevel.findMany({
      where: { id: { in: refLevelIds }, teacherId: profileSnapshot.id },
      select: { id: true },
    }),
    prisma.teacherClassType.findMany({
      where: { id: { in: refTypeIds }, teacherId: profileSnapshot.id },
      select: { id: true, code: true },
    }),
  ]);
  if (foundLevels.length !== refLevelIds.length) {
    return NextResponse.json(
      { error: "classLevelId does not belong to this teacher" },
      { status: 400 },
    );
  }
  if (foundTypes.length !== refTypeIds.length) {
    return NextResponse.json(
      { error: "classTypeId does not belong to this teacher" },
      { status: 400 },
    );
  }
  const codeByTypeId = new Map(foundTypes.map((t) => [t.id, t.code]));

  const newOfferings = deriveMissingOfferingsFromSchedule({
    existing: profileSnapshot.lessonOfferings,
    scheduled: parsed.data.map((slot) => ({
      classTypeId: slot.classTypeId,
      classTypeCode: codeByTypeId.get(slot.classTypeId) ?? "",
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
          classLevelId: slot.classLevelId,
          classTypeId: slot.classTypeId,
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
          classTypeId: o.classTypeId,
        })),
      });
    }
    // Make sure every offering (existing + just-created) has a matching
    // LessonProduct row so students can actually see/book it.
    const offeringsForCatalog = [
      ...profileSnapshot.lessonOfferings.map((o) => ({
        classType: o.classTypeId
          ? { code: codeByTypeId.get(o.classTypeId) ?? "" }
          : null,
        durationMin: o.durationMin,
        active: o.active,
      })),
      ...newOfferings.map((o) => ({
        classType: { code: codeByTypeId.get(o.classTypeId) ?? "" },
        durationMin: o.durationMin,
        active: o.active,
      })),
    ];
    await ensureCatalogProductsForOfferings(tx, offeringsForCatalog);
  });

  return NextResponse.json({ ok: true });
}
