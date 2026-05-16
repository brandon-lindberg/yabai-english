import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmPaidBookingFromPayment } from "@/lib/booking-payment-confirmation";
import { resolveStripeAccountStatus } from "@/lib/stripe/stripe-account-status";
import { constructStripeWebhookEvent } from "@/lib/stripe/stripe-connect";

type StripeEventLike = {
  id: string;
  type: string;
  account?: string;
  data: {
    object: Record<string, unknown>;
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

async function syncConnectedAccountFromWebhook(event: StripeEventLike) {
  const stripeAccount = event.data.object;
  const providerAccountId = stringValue(stripeAccount.id) ?? event.account;
  if (!providerAccountId) return null;

  const paymentAccount = await prisma.teacherPaymentAccount.findFirst({
    where: { provider: "STRIPE", providerAccountId },
    select: { id: true },
  });
  if (!paymentAccount) return null;

  const status = resolveStripeAccountStatus({
    charges_enabled: Boolean(stripeAccount.charges_enabled),
    payouts_enabled: Boolean(stripeAccount.payouts_enabled),
    requirements: stripeAccount.requirements as never,
  });

  await prisma.teacherPaymentMethod.upsert({
    where: {
      accountId_method: {
        accountId: paymentAccount.id,
        method: "CARD",
      },
    },
    create: {
      accountId: paymentAccount.id,
      method: "CARD",
      enabled: status.methodEnabled,
    },
    update: {
      enabled: status.methodEnabled,
    },
  });

  return prisma.teacherPaymentAccount.update({
    where: { id: paymentAccount.id },
    data: {
      status: status.status,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
    },
  });
}

async function disableConnectedAccountFromWebhook(event: StripeEventLike) {
  const providerAccountId =
    event.account ??
    stringValue(event.data.object.account) ??
    stringValue(event.data.object.id);
  if (!providerAccountId) return null;

  const accounts = await prisma.teacherPaymentAccount.findMany({
    where: { provider: "STRIPE", providerAccountId },
    select: { id: true },
  });
  if (accounts.length === 0) return null;
  const accountIds = accounts.map((account) => account.id);

  await prisma.teacherPaymentMethod.updateMany({
    where: { accountId: { in: accountIds } },
    data: { enabled: false },
  });
  const updated = await prisma.teacherPaymentAccount.updateMany({
    where: { id: { in: accountIds } },
    data: {
      status: "DISABLED",
      chargesEnabled: false,
      payoutsEnabled: false,
      providerAccountId: null,
      requirementsDue: [],
    },
  });
  return updated;
}

async function handleCheckoutSessionCompleted(event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  const bookingId = stringValue(metadata.bookingId);
  if (!paymentId || !bookingId) {
    return NextResponse.json({ error: "Stripe session missing payment metadata" }, { status: 400 });
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : typeof session.payment_intent === "object" &&
          session.payment_intent !== null &&
          "id" in session.payment_intent
        ? stringValue((session.payment_intent as { id?: unknown }).id)
        : null;

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCEEDED",
      providerCheckoutId: stringValue(session.id),
      providerPaymentId: paymentIntent,
      paidAt: new Date(),
    },
  });

  if (!payment.bookingId) {
    return NextResponse.json({ error: "Payment has no booking" }, { status: 409 });
  }

  const result = await confirmPaidBookingFromPayment(payment.bookingId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    paymentStatus: payment.status,
    bookingId: result.booking.id,
    bookingStatus: result.booking.status,
  });
}

async function handleCheckoutSessionExpired(event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "EXPIRED",
      providerCheckoutId: stringValue(session.id),
    },
  });
  return NextResponse.json({ ok: true, paymentStatus: "EXPIRED" });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 401 });
  }

  let event: StripeEventLike;
  try {
    event = constructStripeWebhookEvent(rawBody, signature) as unknown as StripeEventLike;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  const claimed = await prisma.paymentWebhookEvent.createMany({
    data: [{
      provider: "STRIPE",
      providerEventId: event.id,
      eventType: event.type,
      payloadJson: event as never,
    }],
    skipDuplicates: true,
  });
  if (claimed.count === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted(event);
  }
  if (event.type === "checkout.session.expired") {
    return handleCheckoutSessionExpired(event);
  }
  if (event.type === "account.updated") {
    await syncConnectedAccountFromWebhook(event);
    return NextResponse.json({ ok: true });
  }
  if (event.type === "account.application.deauthorized") {
    await disableConnectedAccountFromWebhook(event);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
