import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import { deriveMissingOfferingsFromSchedule } from "@/lib/schedule-offering-sync";
import {
  deriveFreeTrialOffering,
  FREE_TRIAL_DEFAULT_LEVEL_CODE,
  FREE_TRIAL_DEFAULT_TYPE_CODE,
  FREE_TRIAL_DURATION_MIN,
  isFreeTrialSlotPublishable,
} from "@/lib/free-trial-offering";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";
import { seedDefaultTeacherTaxonomy } from "@/lib/teacher-default-taxonomy";
import { dateOnlyToUtcDateInZone } from "@/lib/date-only-in-zone";
import {
  availabilityWindowEndDayKey,
  isWithinAvailabilityWindow,
} from "@/lib/availability-window";
import { canTeacherPublishAvailability, resolveTeacherPublishAvailabilityOptions } from "@/lib/payment-methods";

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
          recurrence: true,
          startsOn: true,
          endsOn: true,
          classLevelId: true,
          classTypeId: true,
          teacherLessonOfferingId: true,
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

  // Availability may only be published inside the rolling three-calendar-month
  // window. Checked here rather than in the zod schema because the schema is
  // pure and the window depends on the current date.
  const now = new Date();
  const outOfWindow = parsed.data.find(
    (slot) =>
      (slot.startsOn && !isWithinAvailabilityWindow(slot.startsOn, now, slot.timezone)) ||
      (slot.endsOn && !isWithinAvailabilityWindow(slot.endsOn, now, slot.timezone)),
  );
  if (outOfWindow) {
    return NextResponse.json(
      {
        error: `Availability can only be set up to ${availabilityWindowEndDayKey(
          now,
          outOfWindow.timezone,
        )}.`,
      },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const profileSnapshot = await prisma.teacherProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      id: true,
      rateYen: true,
      offersFreeTrial: true,
      paymentPolicyAcceptedAt: true,
      paymentAccounts: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          status: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: { select: { method: true, enabled: true } },
        },
      },
      lessonOfferings: {
        select: {
          classTypeId: true,
          classLevelId: true,
          id: true,
          active: true,
          rateYen: true,
          isGroup: true,
          durationMin: true,
          isFreeTrial: true,
          adminRateOverrideByUserId: true,
        },
      },
    },
  });

  // Defensively seed default taxonomy in case the teacher reached this PATCH
  // before the onboarding flow ran (e.g. legacy profile).
  await seedDefaultTeacherTaxonomy(prisma, profileSnapshot.id);

  if (
    parsed.data.length > 0 &&
    !canTeacherPublishAvailability(
      profileSnapshot.paymentPolicyAcceptedAt,
      profileSnapshot.paymentAccounts,
      resolveTeacherPublishAvailabilityOptions(),
    )
  ) {
    return NextResponse.json(
      { error: "Finish Stripe setup and accept the payment policy before publishing availability." },
      { status: 409 },
    );
  }

  // Validate that every classLevelId / classTypeId belongs to this teacher.
  const refLevelIds = Array.from(new Set(parsed.data.map((s) => s.classLevelId)));
  const refTypeIds = Array.from(new Set(parsed.data.map((s) => s.classTypeId)));
  const refOfferIds = Array.from(new Set(parsed.data.map((s) => s.teacherLessonOfferingId)));
  const [foundLevels, foundTypes, foundOfferings] = await Promise.all([
    prisma.teacherClassLevel.findMany({
      where: { id: { in: refLevelIds }, teacherId: profileSnapshot.id },
      select: { id: true },
    }),
    prisma.teacherClassType.findMany({
      where: { id: { in: refTypeIds }, teacherId: profileSnapshot.id },
      select: { id: true, code: true },
    }),
    prisma.teacherLessonOffering.findMany({
      where: { id: { in: refOfferIds }, teacherId: profileSnapshot.id, active: true },
      select: {
        id: true,
        classLevelId: true,
        classTypeId: true,
        durationMin: true,
        active: true,
        isGroup: true,
        rateYen: true,
        isFreeTrial: true,
        classType: { select: { code: true } },
      },
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
  if (foundOfferings.length !== refOfferIds.length) {
    return NextResponse.json(
      { error: "teacherLessonOfferingId does not belong to this teacher" },
      { status: 400 },
    );
  }
  const codeByTypeId = new Map(foundTypes.map((t) => [t.id, t.code]));
  const offeringById = new Map(foundOfferings.map((offering) => [offering.id, offering]));
  const mismatchedSlot = parsed.data.find((slot) => {
    const offering = offeringById.get(slot.teacherLessonOfferingId);
    return (
      !offering ||
      offering.classLevelId !== slot.classLevelId ||
      offering.classTypeId !== slot.classTypeId ||
      slot.endMin - slot.startMin !== offering.durationMin
    );
  });
  if (mismatchedSlot) {
    return NextResponse.json(
      { error: "Availability must match the selected class offer." },
      { status: 400 },
    );
  }

  const unpublishableTrialSlot = parsed.data.find((slot) => {
    const offering = offeringById.get(slot.teacherLessonOfferingId);
    if (!offering?.isFreeTrial) return false;
    return !isFreeTrialSlotPublishable({
      durationMin: slot.endMin - slot.startMin,
      offersFreeTrial: profileSnapshot.offersFreeTrial,
    });
  });
  if (unpublishableTrialSlot) {
    return NextResponse.json(
      {
        error: profileSnapshot.offersFreeTrial
          ? `Free trial availability must be ${FREE_TRIAL_DURATION_MIN} minutes long.`
          : "Turn on free trial lessons before publishing free trial availability.",
      },
      { status: 400 },
    );
  }

  // Without a trial offering there is nothing for a trial slot to point at.
  // Every teacher gets one by default, hung off the seeded taxonomy so it does
  // not depend on what they happen to have scheduled.
  const [trialLevel, trialType] = await Promise.all([
    prisma.teacherClassLevel.findFirst({
      where: { teacherId: profileSnapshot.id, code: FREE_TRIAL_DEFAULT_LEVEL_CODE },
      select: { id: true },
    }),
    prisma.teacherClassType.findFirst({
      where: { teacherId: profileSnapshot.id, code: FREE_TRIAL_DEFAULT_TYPE_CODE },
      select: { id: true },
    }),
  ]);
  const trialOffering = deriveFreeTrialOffering({
    existing: profileSnapshot.lessonOfferings,
    offersFreeTrial: profileSnapshot.offersFreeTrial,
    classLevelId: trialLevel?.id ?? null,
    classTypeId: trialType?.id ?? null,
  });

  const newOfferings = deriveMissingOfferingsFromSchedule({
    existing: profileSnapshot.lessonOfferings,
    scheduled: parsed.data.map((slot) => ({
      classLevelId: slot.classLevelId,
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
          recurrence: slot.recurrence ?? "WEEKLY",
          startsOn: dateOnlyToUtcDateInZone(slot.startsOn, slot.timezone),
          endsOn: dateOnlyToUtcDateInZone(slot.endsOn, slot.timezone),
          classLevelId: slot.classLevelId,
          classTypeId: slot.classTypeId,
          teacherLessonOfferingId: slot.teacherLessonOfferingId,
          active: true,
        })),
      });
    }
    if (trialOffering) {
      await tx.teacherLessonOffering.create({
        data: {
          teacherId: profileSnapshot.id,
          durationMin: trialOffering.durationMin,
          rateYen: trialOffering.rateYen,
          isGroup: trialOffering.isGroup,
          groupSize: trialOffering.groupSize,
          isFreeTrial: trialOffering.isFreeTrial,
          active: trialOffering.active,
          classLevelId: trialOffering.classLevelId,
          classTypeId: trialOffering.classTypeId,
        },
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
          classLevelId: o.classLevelId,
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
