import { DateTime } from "luxon";
import type { TeacherPlatformTier } from "@/generated/prisma/client";

export const PLATFORM_FEE_POLICY_VERSION = "teacher-tiered-monthly-volume-v1";
export const PLATFORM_FEE_TIME_ZONE = "Asia/Tokyo";

type FeePrisma = {
  payment: {
    count: (args: {
      where: {
        teacherId: string;
        status: "SUCCEEDED";
        paidAt: { gte: Date; lt: Date };
      };
    }) => Promise<number>;
  };
  teacherTierState?: {
    findUnique: (args: {
      where: { teacherId: string };
      select: {
        calculatedTier: true;
        overrideTier: true;
        overrideStartsAt: true;
        overrideExpiresAt: true;
      };
    }) => Promise<TeacherTierStateLike | null>;
  };
};

export type PlatformFeeCalculation = {
  feePolicyVersion: typeof PLATFORM_FEE_POLICY_VERSION;
  teacherTier: TeacherPlatformTier;
  paidLessonOrdinal: number;
  rateBps: 2000 | 1500 | 1000;
  applicationFeeAmountYen: number;
};

export type TeacherTierStateLike = {
  calculatedTier: TeacherPlatformTier;
  overrideTier?: TeacherPlatformTier | null;
  overrideStartsAt?: Date | null;
  overrideExpiresAt?: Date | null;
};

export type PaymentMonthBounds = {
  periodTimeZone: typeof PLATFORM_FEE_TIME_ZONE;
  periodStart: Date;
  periodEnd: Date;
};

export function calculateMonthlyPlatformFee({
  amountYen,
  priorPaidLessons,
}: {
  amountYen: number;
  priorPaidLessons: number;
}): PlatformFeeCalculation {
  return calculateTieredPlatformFee({
    amountYen,
    priorPaidLessons,
    teacherTier: "TIER_1",
  });
}

export function calculateTieredPlatformFee({
  amountYen,
  priorPaidLessons,
  teacherTier,
}: {
  amountYen: number;
  priorPaidLessons: number;
  teacherTier: TeacherPlatformTier;
}): PlatformFeeCalculation {
  const paidLessonOrdinal = priorPaidLessons + 1;
  const rateBps = resolveTierRateBps(teacherTier, paidLessonOrdinal);

  return {
    feePolicyVersion: PLATFORM_FEE_POLICY_VERSION,
    teacherTier,
    paidLessonOrdinal,
    rateBps,
    applicationFeeAmountYen: Math.floor((amountYen * rateBps) / 10_000),
  };
}

export function resolveTierRateBps(
  teacherTier: TeacherPlatformTier,
  paidLessonOrdinal: number,
): 2000 | 1500 | 1000 {
  if (teacherTier === "TIER_3") return 1000;
  if (teacherTier === "TIER_2") {
    return paidLessonOrdinal <= 10 ? 1500 : 1000;
  }
  return paidLessonOrdinal <= 5 ? 2000 : paidLessonOrdinal <= 10 ? 1500 : 1000;
}

export function resolveEffectiveTeacherTier(
  state: TeacherTierStateLike | null | undefined,
  at: Date,
): { effectiveTier: TeacherPlatformTier; overrideActive: boolean } {
  if (!state) {
    return { effectiveTier: "TIER_1", overrideActive: false };
  }

  const overrideStarted = !state.overrideStartsAt || state.overrideStartsAt <= at;
  const overrideUnexpired = !state.overrideExpiresAt || state.overrideExpiresAt > at;
  if (state.overrideTier && overrideStarted && overrideUnexpired) {
    return { effectiveTier: state.overrideTier, overrideActive: true };
  }

  return { effectiveTier: state.calculatedTier, overrideActive: false };
}

export function getTokyoPaymentMonthBounds(at: Date): PaymentMonthBounds {
  const start = DateTime.fromJSDate(at, { zone: PLATFORM_FEE_TIME_ZONE })
    .startOf("month");
  const end = start.plus({ months: 1 });

  return {
    periodTimeZone: PLATFORM_FEE_TIME_ZONE,
    periodStart: start.toUTC().toJSDate(),
    periodEnd: end.toUTC().toJSDate(),
  };
}

export async function countSuccessfulPaidLessonsForFeePeriod(
  prisma: FeePrisma,
  {
    teacherId,
    at,
  }: {
    teacherId: string;
    at: Date;
  },
) {
  const { periodStart, periodEnd } = getTokyoPaymentMonthBounds(at);

  return prisma.payment.count({
    where: {
      teacherId,
      status: "SUCCEEDED",
      paidAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });
}

export async function calculateMonthlyPlatformFeeForTeacher(
  prisma: FeePrisma,
  {
    teacherId,
    amountYen,
    at = new Date(),
  }: {
    teacherId: string;
    amountYen: number;
    at?: Date;
  },
) {
  const bounds = getTokyoPaymentMonthBounds(at);
  const priorPaidLessons = await countSuccessfulPaidLessonsForFeePeriod(prisma, {
    teacherId,
    at,
  });
  const tierState = prisma.teacherTierState
    ? await prisma.teacherTierState.findUnique({
        where: { teacherId },
        select: {
          calculatedTier: true,
          overrideTier: true,
          overrideStartsAt: true,
          overrideExpiresAt: true,
        },
      })
    : null;
  const { effectiveTier, overrideActive } = resolveEffectiveTeacherTier(tierState, at);
  const fee = calculateTieredPlatformFee({
    amountYen,
    priorPaidLessons,
    teacherTier: effectiveTier,
  });

  return {
    ...fee,
    ...bounds,
    calculatedTier: tierState?.calculatedTier ?? "TIER_1",
    effectiveTier,
    overrideActive,
  };
}
