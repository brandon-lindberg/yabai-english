import "server-only";

import Stripe from "stripe";
import { EXCLUDED_CHECKOUT_METHODS } from "@/lib/payment-methods";

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

type PaymentMethodConfigurationLike = {
  active: boolean;
  is_default: boolean;
  application: string | null;
};

/**
 * Picks the configuration Checkout applies to our direct charges on the
 * account: the default one our platform manages for it when there is one, else
 * the account's own default.
 */
export function pickCheckoutPaymentMethodConfiguration<T extends PaymentMethodConfigurationLike>(
  configurations: T[],
): T | null {
  const active = configurations.filter((configuration) => configuration.active);
  return (
    active.find((configuration) => configuration.is_default && configuration.application) ??
    active.find((configuration) => configuration.is_default) ??
    active[0] ??
    null
  );
}

/**
 * Every payment method type the configuration marks `available` — Stripe's own
 * "display preference is on and the capability is active", i.e. what Checkout
 * may show a student. Methods sit on the configuration as keys of their own
 * name, so any key whose value carries an `available` flag is one.
 */
export function availablePaymentMethodTypes(configuration: object): string[] {
  return Object.entries(configuration)
    .filter(
      ([, value]) =>
        typeof value === "object" &&
        value !== null &&
        (value as { available?: unknown }).available === true,
    )
    .map(([type]) => type);
}

export async function retrieveStripeCheckoutMethods(connectedAccountId: string) {
  const configurations = await stripe().paymentMethodConfigurations.list(
    { limit: 100 },
    { stripeAccount: connectedAccountId },
  );
  const configuration = pickCheckoutPaymentMethodConfiguration(configurations.data);
  return configuration ? availablePaymentMethodTypes(configuration) : [];
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
      // Methods otherwise follow the teacher's Stripe Dashboard settings.
      excluded_payment_method_types: [...EXCLUDED_CHECKOUT_METHODS],
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

export async function retrieveStripeCheckoutSession({
  sessionId,
  connectedAccountId,
}: {
  sessionId: string;
  connectedAccountId: string;
}) {
  return stripe().checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: connectedAccountId },
  );
}

export async function createStripeRefundDirectCharge({
  connectedAccountId,
  paymentIntentId,
  amountYen,
  paymentId,
  bookingId,
  idempotencyKey,
}: {
  connectedAccountId: string;
  paymentIntentId: string;
  amountYen: number;
  paymentId: string;
  bookingId: string;
  idempotencyKey?: string;
}) {
  return stripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountYen,
      metadata: {
        paymentId,
        bookingId,
        ...(idempotencyKey ? { recoveryKey: idempotencyKey } : {}),
      },
    },
    { stripeAccount: connectedAccountId, idempotencyKey: idempotencyKey ?? `lesson-refund:${paymentId}` },
  );
}

export async function listStripeRefundsForPayment(connectedAccountId: string, paymentIntentId: string) {
  const refunds: Stripe.Refund[] = [];
  let after: string | undefined;
  do {
    const page = await stripe().refunds.list({ payment_intent: paymentIntentId, limit: 100, ...(after ? { starting_after: after } : {}) }, { stripeAccount: connectedAccountId });
    refunds.push(...page.data);
    if (!page.has_more) break;
    const next = page.data.at(-1)?.id;
    if (!next || next === after) throw new Error("Stripe refund pagination did not advance");
    after = next;
  } while (true);
  return refunds;
}

export async function retrieveStripeRefund(connectedAccountId: string, refundId: string) {
  return stripe().refunds.retrieve(refundId, {}, { stripeAccount: connectedAccountId });
}

export async function retrieveStripePaymentIntent(connectedAccountId: string, paymentIntentId: string) {
  return stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] }, { stripeAccount: connectedAccountId });
}

export async function retrieveStripeApplicationFee(feeId: string) {
  return stripe().applicationFees.retrieve(feeId);
}

export async function retrieveStripeCharge(connectedAccountId: string, chargeId: string) {
  return stripe().charges.retrieve(chargeId, {}, { stripeAccount: connectedAccountId });
}

export async function refundStripeApplicationFee(feeId: string, amount: number, paymentId: string, bookingId: string, idempotencyKey: string) {
  return stripe().applicationFees.createRefund(feeId, { amount, metadata: { paymentId, bookingId } }, { idempotencyKey });
}
