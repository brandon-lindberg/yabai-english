import { NextResponse } from "next/server";
import { LessonTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filterLessonProductsForTeacher } from "@/lib/lesson-products";

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
    select: { offersFreeTrial: true },
  });
  if (!teacher) {
    return NextResponse.json(products.filter((p) => p.tier !== LessonTier.FREE_TRIAL));
  }

  return NextResponse.json(filterLessonProductsForTeacher(products, teacher.offersFreeTrial));
}
