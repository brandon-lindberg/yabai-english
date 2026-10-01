import { prisma } from "@/lib/prisma";
import { syncTeacherPaymentAccountFromStripe } from "@/lib/stripe/sync-teacher-payment-account";
import { notifyTeacherOfStripePhaseChange } from "@/lib/stripe/stripe-account-notifications";
import { classifyStripeAccount } from "@/lib/teacher-stripe-setup";
import type { resolveStripeAccountStatus } from "@/lib/stripe/stripe-account-status";
import { retrieveStripeCheckoutMethods } from "@/lib/stripe/stripe-connect";
import { isLocalStripeProviderAccount } from "@/lib/payment-methods";

type StripeAccountLike = Parameters<typeof resolveStripeAccountStatus>[0];

/** Everything `classifyStripeAccount` reads, plus the teacher to notify. */
const PHASE_SELECT = {
  id: true,
  provider: true,
  providerAccountId: true,
  status: true,
  chargesEnabled: true,
  payoutsEnabled: true,
  requirementsDue: true,
  detailsSubmitted: true,
  pendingVerification: true,
  disabledReason: true,
  methods: { select: { method: true, enabled: true } },
  teacher: { select: { userId: true } },
} as const;

/**
 * Syncs a connected account from Stripe and tells the teacher when the result
 * changes what they need to do.
 *
 * The webhook and the manual refresh both go through here rather than calling
 * the sync directly, so a teacher gets the same notification whichever path
 * observed the change first — and gets it exactly once, since the phase is
 * compared against what we had stored rather than against nothing.
 */
export async function syncAndNotifyTeacherPaymentAccount(input: {
  paymentAccountId: string;
  stripeAccount: StripeAccountLike;
  select?: Record<string, unknown>;
}) {
  const before = await prisma.teacherPaymentAccount.findUnique({
    where: { id: input.paymentAccountId },
    select: PHASE_SELECT,
  });

  const checkoutMethods = await readCheckoutMethods(before?.providerAccountId);

  const account = await syncTeacherPaymentAccountFromStripe(prisma, {
    paymentAccountId: input.paymentAccountId,
    stripeAccount: input.stripeAccount,
    ...(checkoutMethods ? { checkoutMethods } : {}),
    ...(input.select ? { select: input.select } : {}),
  });

  const after = await prisma.teacherPaymentAccount.findUnique({
    where: { id: input.paymentAccountId },
    select: PHASE_SELECT,
  });

  const userId = after?.teacher?.userId ?? before?.teacher?.userId ?? null;
  if (before && after && userId) {
    await notifyTeacherOfStripePhaseChange({
      userId,
      previousPhase: classifyStripeAccount(before),
      nextPhase: classifyStripeAccount(after),
      requirementsDue: after.requirementsDue,
    });
  }

  return account;
}

/**
 * Stripe sends no event when a teacher changes which payment methods they
 * accept, so every account sync re-reads them. A failed read returns null and
 * keeps what we had: the sync's real job is the account status, and an unread
 * method list must not block it or blank the methods students see.
 */
async function readCheckoutMethods(providerAccountId: string | null | undefined) {
  if (!providerAccountId || isLocalStripeProviderAccount(providerAccountId)) return null;
  try {
    return await retrieveStripeCheckoutMethods(providerAccountId);
  } catch (err) {
    console.error(`Stripe payment method configuration read failed for ${providerAccountId}:`, err);
    return null;
  }
}
