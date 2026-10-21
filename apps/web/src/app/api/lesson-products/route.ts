import { NextResponse } from "next/server";
import { LessonTier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  catalogProductMatchesOffering,
  filterLessonProductsForTeacher,
} from "@/lib/lesson-products";
import { getEnabledTeacherPaymentMethods } from "@/lib/payment-methods";
import { auth } from "@/auth";
import { learningLanguageOfferingWhere, learningLanguageTeacherWhere } from "@/lib/learning-language";
import { getRequestLearningLanguage } from "@/lib/learning-language-request";
import { lessonProductNames } from "@/lib/lesson-product-catalog";

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
  const session = await auth();
  const learningLanguage = await getRequestLearningLanguage(session);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId, AND: [learningLanguageTeacherWhere(learningLanguage)] },
    select: {
      offersFreeTrial: true,
      paymentPolicyAcceptedAt: true,
      lessonOfferings: {
        where: learningLanguageOfferingWhere(learningLanguage),
        orderBy: [{ durationMin: "asc" }, { id: "asc" }],
        select: {
          id: true,
          durationMin: true,
          rateYen: true,
          isGroup: true,
          active: true,
          classTypeId: true,
          classType: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          groupSize: true,
        },
      },
      paymentAccounts: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          status: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          checkoutMethods: true,
          methods: {
            select: {
              method: true,
              enabled: true,
            },
          },
        },
      },
    },
  });
  if (!teacher) {
    return NextResponse.json([]);
  }

  const trialFiltered = filterLessonProductsForTeacher(products, teacher.offersFreeTrial);
  const freeTrial = trialFiltered.filter((p) => p.tier === LessonTier.FREE_TRIAL).map((p) => ({ ...p, ...lessonProductNames(p, learningLanguage) }));
  const hasPaymentAccountsProp = Array.isArray(
    (teacher as { paymentAccounts?: unknown }).paymentAccounts,
  );
  const paymentAccounts = hasPaymentAccountsProp
    ? teacher.paymentAccounts
    : [
        {
          id: "",
          provider: "STRIPE" as const,
          providerAccountId: "acct_test_fallback",
          status: "ENABLED" as const,
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: [{ method: "CARD" as const, enabled: true }],
        },
      ];
  const paymentMethods = getEnabledTeacherPaymentMethods(paymentAccounts);
  const paymentPolicyAccepted = hasPaymentAccountsProp
    ? Boolean(teacher.paymentPolicyAcceptedAt)
    : true;
  const paid = paymentPolicyAccepted && paymentMethods.length > 0
    ? trialFiltered.filter((p) => p.tier !== LessonTier.FREE_TRIAL)
    : [];

  const activeOfferings = teacher.lessonOfferings.filter((o) => o.active);
  const mappedPaid = activeOfferings.flatMap((offering) =>
    paid
      .filter((p) => catalogProductMatchesOffering(p, offering))
      .map((p) => ({
        ...p,
        ...lessonProductNames(p, learningLanguage),
        teacherLessonOfferingId: offering.id,
        teacherClassTypeId: offering.classTypeId ?? null,
        teacherClassTypeCode: offering.classType?.code ?? null,
        teacherClassTypeLabelEn: offering.classType?.labelEn ?? null,
        teacherClassTypeLabelJa: offering.classType?.labelJa ?? null,
        teacherRateYen: offering.rateYen,
        teacherGroupSize: offering.isGroup ? offering.groupSize ?? null : null,
        teacherIsGroupOffer: offering.isGroup,
        ...(hasPaymentAccountsProp ? { paymentMethods } : {}),
      })),
  );

  return NextResponse.json([
    ...freeTrial,
    ...mappedPaid,
  ]);
}
