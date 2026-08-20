import { DateTime } from "luxon";
import type {
  TeacherPlatformTier,
  TeacherTierEvaluationKind,
  TeacherTierEvaluationStatus,
} from "@/generated/prisma/client";
import {
  PLATFORM_FEE_TIME_ZONE,
  resolveEffectiveTeacherTier,
  type TeacherTierStateLike,
} from "@/lib/platform-fees";

export type TeacherTierBounds = {
  periodTimeZone: typeof PLATFORM_FEE_TIME_ZONE;
  periodStart: Date;
  periodEnd: Date;
};

type TierCountPrisma = {
  payment: {
    count: (args: {
      where: {
        teacherId: string;
        status: "SUCCEEDED";
        bookingId: { not: null };
        amountYen: { gt: number };
        paidAt: { gte: Date; lt: Date };
        refunds: { none: { status: "SUCCEEDED" } };
      };
    }) => Promise<number>;
    findFirst?: (args: {
      where: {
        teacherId: string;
        status: "SUCCEEDED";
        bookingId: { not: null };
        amountYen: { gt: number };
        paidAt: { not: null };
      };
      orderBy: { paidAt: "asc" };
      select: { paidAt: true };
    }) => Promise<{ paidAt: Date | null } | null>;
  };
};

type TierWritePrisma = TierCountPrisma & {
  teacherTierState: {
    findUnique: (args: {
      where: { teacherId: string };
      select?: Record<string, boolean>;
    }) => Promise<(TeacherTierStateLike & {
      id: string;
      firstPaidLessonAt: Date | null;
      tierYearStart: Date | null;
      nextQuarterlyReviewAt: Date | null;
      nextAnnualReviewAt: Date | null;
      effectiveTier: TeacherPlatformTier;
    }) | null>;
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    update: (args: {
      where: { teacherId: string } | { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  teacherTierAuditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  teacherTierEvaluation?: {
    upsert: (args: {
      where: {
        teacherId_kind_periodStart_periodEnd: {
          teacherId: string;
          kind: TeacherTierEvaluationKind;
          periodStart: Date;
          periodEnd: Date;
        };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

const TIER_RANK: Record<TeacherPlatformTier, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

export function getTeacherTierPeriodBounds({
  firstPaidLessonAt,
  periodIndex,
  months,
}: {
  firstPaidLessonAt: Date;
  periodIndex: number;
  months: 3 | 12;
}): TeacherTierBounds {
  const start = DateTime.fromJSDate(firstPaidLessonAt, { zone: PLATFORM_FEE_TIME_ZONE })
    .plus({ months: periodIndex * months });
  const end = start.plus({ months });

  return {
    periodTimeZone: PLATFORM_FEE_TIME_ZONE,
    periodStart: start.toUTC().toJSDate(),
    periodEnd: end.toUTC().toJSDate(),
  };
}

export function resolveRecommendedTeacherTier(averageLessons: number): TeacherPlatformTier {
  if (averageLessons <= 5) return "TIER_1";
  if (averageLessons <= 10) return "TIER_2";
  return "TIER_3";
}

export function evaluateTierTransition({
  currentTier,
  recommendedTier,
  kind,
}: {
  currentTier: TeacherPlatformTier;
  recommendedTier: TeacherPlatformTier;
  kind: TeacherTierEvaluationKind;
}): {
  status: TeacherTierEvaluationStatus;
  appliedTier: TeacherPlatformTier | null;
} {
  const currentRank = TIER_RANK[currentTier];
  const recommendedRank = TIER_RANK[recommendedTier];

  if (recommendedRank > currentRank) {
    return { status: "APPLIED", appliedTier: recommendedTier };
  }

  if (recommendedRank === currentRank || kind === "QUARTERLY") {
    return { status: "NO_CHANGE", appliedTier: currentTier };
  }

  return { status: "PENDING_ADMIN_APPROVAL", appliedTier: null };
}

export async function countTierEligiblePaidLessonsForPeriod(
  prisma: TierCountPrisma,
  {
    teacherId,
    periodStart,
    periodEnd,
  }: {
    teacherId: string;
    periodStart: Date;
    periodEnd: Date;
  },
): Promise<number> {
  return prisma.payment.count({
    where: {
      teacherId,
      status: "SUCCEEDED",
      bookingId: { not: null },
      amountYen: { gt: 0 },
      paidAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      refunds: { none: { status: "SUCCEEDED" } },
    },
  });
}

export async function initializeTeacherTierStateFromHistory(
  prisma: TierWritePrisma,
  {
    teacherId,
    paidAt,
  }: {
    teacherId: string;
    paidAt?: Date;
  },
) {
  const existing = await prisma.teacherTierState.findUnique({
    where: { teacherId },
  });
  if (existing?.firstPaidLessonAt) return existing;

  const firstPaidLessonAt =
    paidAt ??
    (await prisma.payment.findFirst?.({
      where: {
        teacherId,
        status: "SUCCEEDED",
        bookingId: { not: null },
        amountYen: { gt: 0 },
        paidAt: { not: null },
      },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }))?.paidAt;

  if (!firstPaidLessonAt) return existing ?? null;

  const firstQuarterEnd = DateTime.fromJSDate(firstPaidLessonAt, {
    zone: PLATFORM_FEE_TIME_ZONE,
  }).plus({ months: 3 }).toUTC().toJSDate();
  const firstYearEnd = DateTime.fromJSDate(firstPaidLessonAt, {
    zone: PLATFORM_FEE_TIME_ZONE,
  }).plus({ months: 12 }).toUTC().toJSDate();

  if (existing) {
    await prisma.teacherTierState.update({
      where: { teacherId },
      data: {
        firstPaidLessonAt,
        tierYearStart: firstPaidLessonAt,
        nextQuarterlyReviewAt: firstQuarterEnd,
        nextAnnualReviewAt: firstYearEnd,
      },
    });
    return prisma.teacherTierState.findUnique({ where: { teacherId } });
  }

  await prisma.teacherTierState.create({
    data: {
      teacherId,
      calculatedTier: "TIER_1",
      effectiveTier: "TIER_1",
      firstPaidLessonAt,
      tierYearStart: firstPaidLessonAt,
      nextQuarterlyReviewAt: firstQuarterEnd,
      nextAnnualReviewAt: firstYearEnd,
    },
  });
  await prisma.teacherTierAuditLog.create({
    data: {
      teacherId,
      action: "INITIALIZED",
      newTier: "TIER_1",
      metadataJson: { firstPaidLessonAt: firstPaidLessonAt.toISOString() },
    },
  });
  return prisma.teacherTierState.findUnique({ where: { teacherId } });
}

export function addTeacherTierMonths(date: Date, months: 3 | 12): Date {
  return DateTime.fromJSDate(date, { zone: PLATFORM_FEE_TIME_ZONE })
    .plus({ months })
    .toUTC()
    .toJSDate();
}

export async function setTeacherTierOverride(
  prisma: TierWritePrisma,
  {
    teacherId,
    tier,
    actorUserId,
    note,
    expiresAt,
    at = new Date(),
  }: {
    teacherId: string;
    tier: TeacherPlatformTier;
    actorUserId: string;
    note?: string | null;
    expiresAt?: Date | null;
    at?: Date;
  },
) {
  const state = await initializeTeacherTierStateFromHistory(prisma, {
    teacherId,
  });
  const previousTier = state?.effectiveTier ?? "TIER_1";
  const effectiveTier = resolveEffectiveTeacherTier(
    {
      calculatedTier: state?.calculatedTier ?? "TIER_1",
      overrideTier: tier,
      overrideStartsAt: at,
      overrideExpiresAt: expiresAt ?? null,
    },
    at,
  ).effectiveTier;

  const data = {
      overrideTier: tier,
      overrideStartsAt: at,
      overrideExpiresAt: expiresAt ?? null,
      overrideNote: note ?? null,
      overrideSetByUserId: actorUserId,
      overrideSetAt: at,
      effectiveTier,
  };
  if (state) {
    await prisma.teacherTierState.update({
      where: { teacherId },
      data,
    });
  } else {
    await prisma.teacherTierState.create({
      data: {
        teacherId,
        calculatedTier: "TIER_1",
        ...data,
      },
    });
  }
  await prisma.teacherTierAuditLog.create({
    data: {
      teacherId,
      actorUserId,
      action: "OVERRIDE_SET",
      previousTier,
      newTier: tier,
      note: note ?? null,
      metadataJson: { expiresAt: expiresAt?.toISOString() ?? null },
    },
  });
}

export async function removeTeacherTierOverride(
  prisma: TierWritePrisma,
  {
    teacherId,
    actorUserId,
    at = new Date(),
  }: {
    teacherId: string;
    actorUserId: string;
    at?: Date;
  },
) {
  const state = await prisma.teacherTierState.findUnique({ where: { teacherId } });
  if (!state) return;
  await prisma.teacherTierState.update({
    where: { teacherId },
    data: {
      overrideTier: null,
      overrideStartsAt: null,
      overrideExpiresAt: null,
      overrideNote: null,
      overrideSetByUserId: null,
      overrideSetAt: null,
      effectiveTier: state.calculatedTier,
    },
  });
  await prisma.teacherTierAuditLog.create({
    data: {
      teacherId,
      actorUserId,
      action: "OVERRIDE_REMOVED",
      previousTier: state.effectiveTier,
      newTier: state.calculatedTier,
      metadataJson: { removedAt: at.toISOString() },
    },
  });
}

export async function evaluateDueTeacherTier(
  prisma: TierWritePrisma,
  {
    teacherId,
    at = new Date(),
  }: {
    teacherId: string;
    at?: Date;
  },
) {
  const state = await initializeTeacherTierStateFromHistory(prisma, { teacherId });
  if (!state?.firstPaidLessonAt || !state.tierYearStart) {
    return { ok: true as const, evaluated: false as const, reason: "NO_PAID_LESSONS" as const };
  }

  const annualDue = state.nextAnnualReviewAt && state.nextAnnualReviewAt <= at;
  const quarterlyDue = state.nextQuarterlyReviewAt && state.nextQuarterlyReviewAt <= at;
  if (!annualDue && !quarterlyDue) {
    return { ok: true as const, evaluated: false as const, reason: "NOT_DUE" as const };
  }

  const kind: TeacherTierEvaluationKind = annualDue ? "ANNUAL" : "QUARTERLY";
  const months = kind === "ANNUAL" ? 12 : 3;
  const periodEnd = (kind === "ANNUAL" ? state.nextAnnualReviewAt : state.nextQuarterlyReviewAt)!;
  const periodStart = kind === "ANNUAL"
    ? state.tierYearStart
    : DateTime.fromJSDate(periodEnd, { zone: PLATFORM_FEE_TIME_ZONE })
        .minus({ months: 3 })
        .toUTC()
        .toJSDate();

  const monthlyCounts = [];
  let totalLessons = 0;
  for (let index = 0; index < months; index += 1) {
    const monthStart = DateTime.fromJSDate(periodStart, { zone: PLATFORM_FEE_TIME_ZONE })
      .plus({ months: index })
      .toUTC()
      .toJSDate();
    const monthEnd = DateTime.fromJSDate(periodStart, { zone: PLATFORM_FEE_TIME_ZONE })
      .plus({ months: index + 1 })
      .toUTC()
      .toJSDate();
    const count = await countTierEligiblePaidLessonsForPeriod(prisma, {
      teacherId,
      periodStart: monthStart,
      periodEnd: monthEnd,
    });
    totalLessons += count;
    monthlyCounts.push({
      periodStart: monthStart.toISOString(),
      periodEnd: monthEnd.toISOString(),
      count,
    });
  }

  const averageLessons = totalLessons / months;
  const recommendedTier = resolveRecommendedTeacherTier(averageLessons);
  const transition = evaluateTierTransition({
    currentTier: state.calculatedTier,
    recommendedTier,
    kind,
  });

  await prisma.teacherTierEvaluation?.upsert({
    where: {
      teacherId_kind_periodStart_periodEnd: {
        teacherId,
        kind,
        periodStart,
        periodEnd,
      },
    },
    create: {
      teacherId,
      kind,
      periodStart,
      periodEnd,
      monthlyCountsJson: monthlyCounts,
      averageLessons,
      recommendedTier,
      appliedTier: transition.appliedTier,
      status: transition.status,
    },
    update: {
      monthlyCountsJson: monthlyCounts,
      averageLessons,
      recommendedTier,
      appliedTier: transition.appliedTier,
      status: transition.status,
    },
  });

  if (transition.status !== "PENDING_ADMIN_APPROVAL") {
    const nextCalculatedTier = transition.appliedTier ?? state.calculatedTier;
    const nextQuarterlyReviewAt = kind === "ANNUAL"
      ? addTeacherTierMonths(periodEnd, 3)
      : addTeacherTierMonths(periodEnd, 3);
    const nextAnnualReviewAt = kind === "ANNUAL"
      ? addTeacherTierMonths(periodEnd, 12)
      : state.nextAnnualReviewAt;
    const tierYearStart = kind === "ANNUAL" ? periodEnd : state.tierYearStart;
    const effectiveTier = resolveEffectiveTeacherTier(
      {
        calculatedTier: nextCalculatedTier,
        overrideTier: state.overrideTier,
        overrideStartsAt: state.overrideStartsAt,
        overrideExpiresAt: state.overrideExpiresAt,
      },
      at,
    ).effectiveTier;

    await prisma.teacherTierState.update({
      where: { teacherId },
      data: {
        calculatedTier: nextCalculatedTier,
        effectiveTier,
        tierYearStart,
        lastEvaluationAt: at,
        nextQuarterlyReviewAt,
        nextAnnualReviewAt,
      },
    });
  }

  await prisma.teacherTierAuditLog.create({
    data: {
      teacherId,
      action: kind === "ANNUAL" ? "ANNUAL_EVALUATED" : "QUARTERLY_EVALUATED",
      previousTier: state.calculatedTier,
      newTier: transition.appliedTier ?? state.calculatedTier,
      metadataJson: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        averageLessons,
        recommendedTier,
        status: transition.status,
      },
    },
  });

  return {
    ok: true as const,
    evaluated: true as const,
    kind,
    periodStart,
    periodEnd,
    averageLessons,
    recommendedTier,
    status: transition.status,
    appliedTier: transition.appliedTier,
  };
}
