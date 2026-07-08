import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function isUsableStripeSecretKey(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Reject placeholder values like "sk_test_" / "sk_live_" with no body after the prefix.
  if (/^sk_(test|live)_$/.test(trimmed)) return false;
  return /^sk_(test|live)_[A-Za-z0-9]+/.test(trimmed);
}

export function stripeConnectConfigured() {
  return isUsableStripeSecretKey(process.env.STRIPE_SECRET_KEY);
}

function stripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!isUsableStripeSecretKey(secretKey)) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export async function createStripeStandardAccount({ email }: { email?: string | null }) {
  return stripe().accounts.create({
    type: "standard",
    ...(email ? { email } : {}),
  });
}

export async function createStripeAccountOnboardingLink({
  accountId,
  refreshUrl,
  returnUrl,
}: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  return stripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function retrieveStripeAccount(accountId: string) {
  return stripe().accounts.retrieve(accountId);
}

export async function createStripeCheckoutSessionDirectCharge({
  connectedAccountId,
  paymentId,
  bookingId,
  amountYen,
  applicationFeeAmountYen,
  productName,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  connectedAccountId: string;
  paymentId: string;
  bookingId: string;
  amountYen: number;
  applicationFeeAmountYen: number;
  productName: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: amountYen,
            product_data: {
              name: productName,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmountYen,
        metadata: {
          paymentId,
          bookingId,
        },
      },
      metadata: {
        paymentId,
        bookingId,
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: connectedAccountId },
  );
}

export function constructStripeWebhookEvent(rawBody: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Refunds the platform's application fee for a direct charge back to the
 * connected account, keeping `keepYen` as the platform's processing fee.
 * Returns null when there is nothing to refund.
 */
export async function createStripeApplicationFeeRefundKeepingProcessingFee({
  connectedAccountId,
  paymentIntentId,
  keepYen,
  paymentId,
  bookingId,
}: {
  connectedAccountId: string;
  paymentIntentId: string;
  keepYen: number;
  paymentId: string;
  bookingId: string;
}) {
  const intent = await stripe().paymentIntents.retrieve(
    paymentIntentId,
    { expand: ["latest_charge"] },
    { stripeAccount: connectedAccountId },
  );
  const charge =
    typeof intent.latest_charge === "object" && intent.latest_charge !== null
      ? intent.latest_charge
      : null;
  const applicationFeeId =
    typeof charge?.application_fee === "string"
      ? charge.application_fee
      : charge?.application_fee?.id ?? null;
  if (!applicationFeeId) {
    return null;
  }

  const applicationFee = await stripe().applicationFees.retrieve(applicationFeeId);
  const refundableYen = applicationFee.amount - applicationFee.amount_refunded - keepYen;
  if (refundableYen <= 0) {
    return null;
  }

  return stripe().applicationFees.createRefund(applicationFeeId, {
    amount: refundableYen,
    metadata: {
      paymentId,
      bookingId,
    },
  });
}

export async function createStripeRefundDirectCharge({
  connectedAccountId,
  paymentIntentId,
  amountYen,
  paymentId,
  bookingId,
}: {
  connectedAccountId: string;
  paymentIntentId: string;
  amountYen: number;
  paymentId: string;
  bookingId: string;
}) {
  return stripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountYen,
      metadata: {
        paymentId,
        bookingId,
      },
    },
    { stripeAccount: connectedAccountId },
  );
}
