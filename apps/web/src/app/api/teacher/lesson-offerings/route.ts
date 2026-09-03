import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";
import {
  lessonOfferingCreateData,
  lessonOfferingInputSchema,
  lessonOfferingRateError,
  normalizeLessonOfferingInput,
} from "@/lib/teacher-lesson-offering-input";
import {
  GROUP_SLOT_RULE_MESSAGES,
  groupSlotRulesViolation,
} from "@/lib/availability-offering-match";

/**
 * Adds one class, and saves it.
 *
 * The rates form's PATCH replaces the teacher's whole set — right for editing a
 * list in place, wrong for adding, because it would make "add a class" mean
 * "rewrite everything you have". Creating is purely additive: nothing points at
 * a class that did not exist a moment ago, so there are no ids to re-bind and
 * no existing rows to disturb.
 *
 * It saves on its own so the teacher is finished when the dialog closes. A
 * dialog that only stages a change, leaving a Save button further down the page
 * to actually commit it, is a step most people miss.
 *
 * Validation is the same module the PATCH uses, so a class accepted here cannot
 * be refused there.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = lessonOfferingInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const offering = normalizeLessonOfferingInput(parsed.data);

  const rateError = lessonOfferingRateError(offering);
  if (rateError) {
    return NextResponse.json({ error: rateError }, { status: 400 });
  }

  // A group class that cannot be taught as one is refused before it exists,
  // rather than at the point somebody tries to publish availability for it.
  const groupViolation = groupSlotRulesViolation(
    { assignedStudentId: null },
    { isGroup: offering.isGroup, groupSize: offering.groupSize, isFreeTrial: false },
  );
  if (groupViolation) {
    return NextResponse.json(
      { error: GROUP_SLOT_RULE_MESSAGES[groupViolation] },
      { status: 400 },
    );
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  // The level and type must be this teacher's own, or the id could name anyone's.
  const [level, type] = await Promise.all([
    prisma.teacherClassLevel.findFirst({
      where: { id: offering.classLevelId, teacherId: profile.id },
      select: { id: true },
    }),
    offering.classTypeId
      ? prisma.teacherClassType.findFirst({
          where: { id: offering.classTypeId, teacherId: profile.id },
          select: { id: true, code: true },
        })
      : Promise.resolve(null),
  ]);
  if (!level) {
    return NextResponse.json(
      { error: "classLevelId does not belong to this teacher" },
      { status: 400 },
    );
  }
  if (offering.classTypeId && !type) {
    return NextResponse.json(
      { error: "classTypeId does not belong to this teacher" },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.teacherLessonOffering.create({
      data: lessonOfferingCreateData(offering, profile.id),
      select: {
        id: true,
        durationMin: true,
        rateYen: true,
        groupTotalRateYen: true,
        ratePriceBasis: true,
        isGroup: true,
        groupSize: true,
        classLevelId: true,
        classTypeId: true,
      },
    });

    // Without a matching catalog product the class exists but no student can
    // pick it, which reads as the save having silently failed.
    await ensureCatalogProductsForOfferings(tx, [
      {
        classType: type ? { code: type.code } : null,
        durationMin: offering.durationMin,
        active: true,
      },
    ]);

    return row;
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard/lessons`);
    revalidatePath(`/${locale}/dashboard/schedule/availability`);
    revalidatePath(`/${locale}/book/teachers/${profile.id}`);
  }

  return NextResponse.json({ ok: true, offering: created });
}
