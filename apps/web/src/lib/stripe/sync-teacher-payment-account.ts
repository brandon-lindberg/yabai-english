import type { TeacherPaymentMethodType } from "@/generated/prisma/client";
import {
  resolveStripeAccountStatus,
  SUPPORTED_METHOD_TYPES,
} from "@/lib/stripe/stripe-account-status";

type SyncPrisma = {
  teacherPaymentMethod: {
    upsert: (args: {
      where: {
        accountId_method: { accountId: string; method: TeacherPaymentMethodType };
      };
      create: {
        accountId: string;
        method: TeacherPaymentMethodType;
        enabled: boolean;
      };
      update: { enabled: boolean };
    }) => Promise<unknown>;
  };
  teacherPaymentAccount: {
    update: (args: {
      where: { id: string };
      data: {
        status: "ENABLED" | "REQUIREMENTS_DUE" | "PENDING";
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
        requirementsDue: string[];
      };
      select?: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

type StripeAccountLike = Parameters<typeof resolveStripeAccountStatus>[0];

/**
 * Brings our record of a connected account in line with Stripe's.
 *
 * Both the account webhook and the manual refresh need exactly this, and they
 * used to carry a copy each — which is how they both ended up hardcoding CARD
 * and PayPay never reached a student. One implementation now, so a method added
 * here shows up in both places.
 *
 * Writes a row for every supported method, enabled or not: a capability that
 * goes away has to switch the option off, not leave a stale row behind.
 */
export async function syncTeacherPaymentAccountFromStripe(
  prisma: SyncPrisma,
  {
    paymentAccountId,
    stripeAccount,
    select,
  }: {
    paymentAccountId: string;
    stripeAccount: StripeAccountLike;
    select?: Record<string, unknown>;
  },
) {
  const status = resolveStripeAccountStatus(stripeAccount);
  const enabled = new Set(status.enabledMethods);

  for (const method of SUPPORTED_METHOD_TYPES) {
    await prisma.teacherPaymentMethod.upsert({
      where: { accountId_method: { accountId: paymentAccountId, method } },
      create: { accountId: paymentAccountId, method, enabled: enabled.has(method) },
      update: { enabled: enabled.has(method) },
    });
  }

  return prisma.teacherPaymentAccount.update({
    where: { id: paymentAccountId },
    data: {
      status: status.status,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
    },
    ...(select ? { select } : {}),
  });
}
