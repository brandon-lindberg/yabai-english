import { DateTime } from "luxon";

export const PLATFORM_FEE_POLICY_VERSION = "teacher-monthly-volume-v1";
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
};

export type PlatformFeeCalculation = {
  feePolicyVersion: typeof PLATFORM_FEE_POLICY_VERSION;
  paidLessonOrdinal: number;
  rateBps: 2000 | 1500 | 1000;
  applicationFeeAmountYen: number;
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
  const paidLessonOrdinal = priorPaidLessons + 1;
  const rateBps = paidLessonOrdinal <= 5 ? 2000 : paidLessonOrdinal <= 10 ? 1500 : 1000;

  return {
    feePolicyVersion: PLATFORM_FEE_POLICY_VERSION,
    paidLessonOrdinal,
    rateBps,
    applicationFeeAmountYen: Math.floor((amountYen * rateBps) / 10_000),
  };
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
  const fee = calculateMonthlyPlatformFee({ amountYen, priorPaidLessons });

  return {
    ...fee,
    ...bounds,
  };
}
