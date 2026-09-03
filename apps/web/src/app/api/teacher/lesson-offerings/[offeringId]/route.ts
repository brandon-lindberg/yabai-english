import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";
import { isTeacherEditableOffering } from "@/lib/teacher-offering-permissions";
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

type Props = { params: Promise<{ offeringId: string }> };

/**
 * Editing and removing one class.
 *
 * These exist so a change keeps the offering's **id**. The rates form used to
 * save by deleting the teacher's whole set and recreating it, and because
 * `AvailabilitySlot.teacherLessonOfferingId` is `SetNull`, every published slot
 * lost its link to the class it belonged to on every save — silently, and with
 * it the duration, price, group size and free-trial status the booking page
 * reads from that link. Updating in place cannot do that.
 */

/** The offering, if it exists and is this teacher's to change. */
async function resolveEditableOffering(userId: string, offeringId: string) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { error: "No teacher profile", status: 404 as const };

  const offering = await prisma.teacherLessonOffering.findFirst({
    where: { id: offeringId, teacherId: profile.id },
    select: { id: true, isFreeTrial: true, adminRateOverrideByUserId: true },
  });
  if (!offering) return { error: "Not found", status: 404 as const };

  // The free trial and an admin-granted concession live in this table too, and
  // are the teacher's to use but not to author.
  if (!isTeacherEditableOffering(offering)) {
    return { error: "This class is not yours to change.", status: 403 as const };
  }

  return { profileId: profile.id, offeringId: offering.id };
}

export async function PATCH(req: Request, { params }: Props) {
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

  const { offeringId } = await params;
  const resolved = await resolveEditableOffering(session.user.id, offeringId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const offering = normalizeLessonOfferingInput(parsed.data);

  const rateError = lessonOfferingRateError(offering);
  if (rateError) {
    return NextResponse.json({ error: rateError }, { status: 400 });
  }

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

  const [level, type] = await Promise.all([
    prisma.teacherClassLevel.findFirst({
      where: { id: offering.classLevelId, teacherId: resolved.profileId },
      select: { id: true },
    }),
    offering.classTypeId
      ? prisma.teacherClassType.findFirst({
          where: { id: offering.classTypeId, teacherId: resolved.profileId },
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

  const updated = await prisma.$transaction(async (tx) => {
    // `teacherId` is not the caller's to move, so it is dropped from the patch.
    const { teacherId: _teacherId, ...data } = lessonOfferingCreateData(
      offering,
      resolved.profileId,
    );
    const row = await tx.teacherLessonOffering.update({
      where: { id: resolved.offeringId },
      data,
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

    await ensureCatalogProductsForOfferings(tx, [
      {
        classType: type ? { code: type.code } : null,
        durationMin: offering.durationMin,
        active: true,
      },
    ]);

    return row;
  });

  revalidateTeacherSurfaces(resolved.profileId);
  return NextResponse.json({ ok: true, offering: updated });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { offeringId } = await params;
  const resolved = await resolveEditableOffering(session.user.id, offeringId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  // Published availability points at this class for its duration and price.
  // Deleting it would leave those slots pointing at nothing — bookable in the
  // calendar but unpriced — so the teacher is asked to clear the schedule
  // first rather than having it quietly unpublished for them.
  const publishedSlots = await prisma.availabilitySlot.count({
    where: { teacherLessonOfferingId: resolved.offeringId, active: true },
  });
  if (publishedSlots > 0) {
    return NextResponse.json(
      {
        error: "Remove this class from your schedule before deleting it.",
        publishedSlots,
      },
      { status: 409 },
    );
  }

  await prisma.teacherLessonOffering.delete({ where: { id: resolved.offeringId } });

  revalidateTeacherSurfaces(resolved.profileId);
  return NextResponse.json({ ok: true });
}

function revalidateTeacherSurfaces(teacherProfileId: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard/lessons`);
    revalidatePath(`/${locale}/dashboard/schedule/availability`);
    revalidatePath(`/${locale}/book/teachers/${teacherProfileId}`);
  }
}
