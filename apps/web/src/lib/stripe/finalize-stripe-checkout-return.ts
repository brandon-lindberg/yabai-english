import { prisma } from "@/lib/prisma";
import { retrieveStripeCheckoutSession, stripeConnectConfigured } from "@/lib/stripe/stripe-connect";
import { confirmBookingFromStripeCheckoutSession } from "@/lib/stripe/confirm-booking-from-stripe-checkout";
import { stripeAccountForPayment } from "./payment-account";

export async function finalizeStripeCheckoutReturn({
  bookingId,
  sessionId,
  revalidateRoster = true,
}: {
  bookingId: string;
  sessionId: string;
  revalidateRoster?: boolean;
}) {
  if (!stripeConnectConfigured()) {
    return { ok: false as const, reason: "STRIPE_NOT_CONFIGURED" as const };
  }

  const payment = await prisma.payment.findFirst({
    where: { bookingId, provider: "STRIPE" },
    orderBy: { createdAt: "desc" },
    select: {
      metadataJson: true,
    },
  });
  const connectedAccountId = payment ? stripeAccountForPayment(payment) : null;

  if (!connectedAccountId) {
    return { ok: false as const, reason: "PAYMENT_NOT_FOUND" as const };
  }

  const checkoutSession = await retrieveStripeCheckoutSession({
    sessionId,
    connectedAccountId,
  });

  const result = await confirmBookingFromStripeCheckoutSession(
    {
      id: checkoutSession.id,
      payment_status: checkoutSession.payment_status,
      metadata: checkoutSession.metadata,
      payment_intent: checkoutSession.payment_intent,
      amount_total: checkoutSession.amount_total,
      currency: checkoutSession.currency,
    },
    { revalidateRoster, connectedAccountId },
  );

  return result.ok
    ? { ok: true as const, bookingStatus: result.bookingStatus }
    : { ok: false as const, reason: result.reason };
}
