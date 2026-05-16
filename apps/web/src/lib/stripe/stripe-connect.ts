import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function stripeConnectConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
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
