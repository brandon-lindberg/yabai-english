import { NextResponse } from "next/server";
import { LessonTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  filterLessonProductsForTeacher,
  filterProductsByIndividualOfferings,
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
        select: {
          durationMin: true,
          rateYen: true,
          isGroup: true,
          active: true,
        },
      },
    },
  });
  if (!teacher) {
    return NextResponse.json(products.filter((p) => p.tier !== LessonTier.FREE_TRIAL));
  }

  const trialFiltered = filterLessonProductsForTeacher(products, teacher.offersFreeTrial);
  const durationFiltered = filterProductsByIndividualOfferings(
    trialFiltered,
    teacher.lessonOfferings,
  );
  return NextResponse.json(durationFiltered);
}
