import "server-only";
import { LearningLanguage } from "@/generated/prisma/enums";
import type { AccountStatus, GoogleIntegrationSettings, PrismaClient, TeacherProfile } from "@/generated/prisma/client";
import { learningLanguageAvailabilityWhere, learningLanguageClassWhere, teacherCanTeach } from "@/lib/learning-language";
import { marketplaceTeacherEligibilityWhere } from "@/lib/marketplace-teacher-filter";
import { teacherMarketplaceRosterOnly } from "@/lib/teacher-marketplace-booking-access";
import { getEnabledTeacherPaymentMethods, isStripeAccountReady } from "@/lib/payment-methods";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";
import { visibleAvailabilityWhere } from "@/lib/assigned-availability";

const taxonomyLabel = { id: true, labelEn: true, labelJa: true } as const;

export async function loadAdminTeacherOverview(
  db: PrismaClient,
  teacher: TeacherProfile,
  accountStatus: AccountStatus,
  google: Pick<GoogleIntegrationSettings, "calendarConnected" | "meetConnected" | "driveConnected"> | null,
) {
  const id = teacher.id;
  const now = new Date();
  const [detail, subjects] = await Promise.all([
    db.teacherProfile.findUniqueOrThrow({
      where: { id },
      select: {
        tierState: true,
        paymentAccounts: {
          where: { provider: "STRIPE" },
          select: {
            id: true, provider: true, providerAccountId: true, status: true, chargesEnabled: true, payoutsEnabled: true,
            methods: { select: { enabled: true, method: true } },
          },
        },
        lessonOfferings: {
          orderBy: [{ active: "desc" }, { durationMin: "asc" }, { id: "asc" }],
          select: {
            id: true, active: true, isFreeTrial: true, isGroup: true, durationMin: true, rateYen: true, learningLanguage: true,
            classLevel: { select: taxonomyLabel }, classType: { select: taxonomyLabel },
          },
        },
      },
    }),
    Promise.all(Object.values(LearningLanguage).map(async (learningLanguage) => {
      const slotWhere = { teacherId: id, active: true, ...learningLanguageAvailabilityWhere(learningLanguage) };
      const [eligible, classReady, availabilityCount, openAvailabilityCount] = await Promise.all([
        db.teacherProfile.count({ where: { id, ...marketplaceTeacherEligibilityWhere(learningLanguage) } }),
        db.teacherProfile.count({ where: { id, ...learningLanguageClassWhere(learningLanguage) } }),
        db.availabilitySlot.count({ where: slotWhere }),
        db.availabilitySlot.count({ where: { ...slotWhere, ...visibleAvailabilityWhere(null) } }),
      ]);
      const permitted = teacherCanTeach(teacher, learningLanguage);
      const rosterOnly = teacherMarketplaceRosterOnly(teacher, learningLanguage);
      const blockers = [];
      if (accountStatus !== "ACTIVE") blockers.push("account" as const);
      if (!permitted) blockers.push("permission" as const);
      if (!classReady) blockers.push("classes" as const);
      if (!eligible && !blockers.length) blockers.push("organization" as const);
      if (eligible && !availabilityCount) blockers.push("availability" as const);
      else if (eligible && !openAvailabilityCount) blockers.push("assignedAvailability" as const);
      return { learningLanguage, permitted, eligible: Boolean(eligible), rosterOnly, availabilityCount, openAvailabilityCount, blockers };
    })),
  ]);
  const stripe = detail.paymentAccounts[0];
  return {
    subjects,
    offerings: detail.lessonOfferings,
    google: {
      calendar: google?.calendarConnected ?? Boolean(teacher.googleCalendarRefreshToken),
      meet: google?.meetConnected ?? false,
      drive: google?.driveConnected ?? false,
    },
    stripe: {
      status: stripe?.status ?? null,
      chargesEnabled: stripe?.chargesEnabled ?? false,
      payoutsEnabled: stripe?.payoutsEnabled ?? false,
      ready: Boolean(stripe && isStripeAccountReady(stripe)),
      paymentMethods: getEnabledTeacherPaymentMethods(detail.paymentAccounts).map(({ method }) => method),
      policyAccepted: Boolean(teacher.paymentPolicyAcceptedAt),
    },
    tier: resolveEffectiveTeacherTier(detail.tierState, now).effectiveTier,
  };
}

export type AdminTeacherOverview = Awaited<ReturnType<typeof loadAdminTeacherOverview>>;
