import { NextResponse } from "next/server";
import { LessonTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  catalogProductMatchesOffering,
  filterLessonProductsForTeacher,
} from "@/lib/lesson-products";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teacherProfileId = url.searchParams.get("teacherProfileId");

  const products = await prisma.lessonProduct.findMany({
    where: { active: true },
    orderBy: [{ tier: "asc" }, { durationMin: "asc" }],
  });

  if (!teacherProfileId) {
    return NextResponse.json(products);
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: {
      offersFreeTrial: true,
      lessonOfferings: {
        where: { active: true },
        orderBy: [{ durationMin: "asc" }, { id: "asc" }],
        select: {
          id: true,
          durationMin: true,
          rateYen: true,
          isGroup: true,
          active: true,
          lessonType: true,
          lessonTypeCustom: true,
          groupSize: true,
        },
      },
    },
  });
  if (!teacher) {
    return NextResponse.json(products.filter((p) => p.tier !== LessonTier.FREE_TRIAL));
  }

  const trialFiltered = filterLessonProductsForTeacher(products, teacher.offersFreeTrial);
  const freeTrial = trialFiltered.filter((p) => p.tier === LessonTier.FREE_TRIAL);
  const paid = trialFiltered.filter((p) => p.tier !== LessonTier.FREE_TRIAL);

  const activeOfferings = teacher.lessonOfferings.filter((o) => o.active);
  const mappedPaid = activeOfferings.flatMap((offering) =>
    paid
      .filter((p) => catalogProductMatchesOffering(p, offering))
      .map((p) => ({
        ...p,
        teacherLessonOfferingId: offering.id,
        teacherLessonType: offering.lessonType ?? null,
        teacherLessonTypeCustom: offering.lessonTypeCustom ?? null,
        teacherRateYen: offering.rateYen,
        teacherGroupSize: offering.isGroup ? offering.groupSize ?? null : null,
        teacherIsGroupOffer: offering.isGroup,
      })),
  );

  return NextResponse.json([
    ...freeTrial,
    ...mappedPaid,
  ]);
}
