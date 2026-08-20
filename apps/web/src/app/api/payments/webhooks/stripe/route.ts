import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTeacherPaymentAccountFromStripe } from "@/lib/stripe/sync-teacher-payment-account";
import { constructStripeWebhookEvent } from "@/lib/stripe/stripe-connect";
import { confirmBookingFromStripeCheckoutSession } from "@/lib/stripe/confirm-booking-from-stripe-checkout";
import { mapStripeRefundStatus } from "@/lib/payment-refunds";
import { notifySuperAdminsOfStuckRefund } from "@/lib/refund-notifications";

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

  return syncTeacherPaymentAccountFromStripe(prisma, {
    paymentAccountId: paymentAccount.id,
    stripeAccount: {
      charges_enabled: Boolean(stripeAccount.charges_enabled),
      payouts_enabled: Boolean(stripeAccount.payouts_enabled),
      requirements: stripeAccount.requirements as never,
      capabilities: stripeAccount.capabilities as never,
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

/**
 * Refund status is not settled when we create it — a direct-charge refund can
 * still move from pending to failed hours later. These events are the only
 * thing that revises the row we wrote at cancellation time.
 */
async function handleRefundStatusChanged(event: StripeEventLike) {
  const stripeRefund = event.data.object;
  const providerRefundId = stringValue(stripeRefund.id);
  if (!providerRefundId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const where = { provider: "STRIPE" as const, providerRefundId };
  const status = mapStripeRefundStatus(stringValue(stripeRefund.status));

  if (status === "FAILED") {
    // The student has not been made whole, so this needs a human rather than a
    // terminal failed state nobody is watching.
    const reason =
      stringValue(stripeRefund.failure_reason) ?? stringValue(stripeRefund.status) ?? "unknown";
    const stored = await prisma.refund.findFirst({
      where,
      select: {
        amountYen: true,
        booking: { select: { student: { select: { name: true } } } },
      },
    });
    await prisma.refund.updateMany({
      where,
      data: {
        status: "PENDING_RECOVERY",
        recoveryNote: `Stripe reported the refund did not complete (${reason}). It must be reissued manually.`,
      },
    });
    if (stored) {
      await notifySuperAdminsOfStuckRefund({
        amountYen: stored.amountYen,
        studentName: stored.booking?.student?.name ?? null,
        note: reason,
      });
    }
    return NextResponse.json({ ok: true, refundStatus: "PENDING_RECOVERY" });
  }

  await prisma.refund.updateMany({ where, data: { status } });
  return NextResponse.json({ ok: true, refundStatus: status });
}

async function handleCheckoutSessionCompleted(event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  const bookingId = stringValue(metadata.bookingId);
  if (!paymentId || !bookingId) {
    return NextResponse.json({ error: "Stripe session missing payment metadata" }, { status: 400 });
  }

  // Delayed payment methods complete the session before money moves; wait for
  // checkout.session.async_payment_succeeded before confirming the booking.
  if (stringValue(session.payment_status) !== "paid") {
    return NextResponse.json({ ok: true, pendingPayment: true });
  }

  const result = await confirmBookingFromStripeCheckoutSession({
    id: stringValue(session.id) ?? "",
    payment_status: stringValue(session.payment_status),
    metadata: metadata as Record<string, string | undefined>,
    payment_intent: session.payment_intent as string | { id?: string } | null | undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    bookingStatus: result.bookingStatus,
    alreadyConfirmed: result.alreadyConfirmed,
  });
}

async function handleCheckoutSessionExpired(event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

  await prisma.payment.updateMany({
    where: { id: paymentId, status: { not: "SUCCEEDED" } },
    data: {
      status: "EXPIRED",
      providerCheckoutId: stringValue(session.id),
    },
  });
  return NextResponse.json({ ok: true, paymentStatus: "EXPIRED" });
}

async function handleCheckoutSessionAsyncPaymentFailed(event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

  await prisma.payment.updateMany({
    where: { id: paymentId, status: { not: "SUCCEEDED" } },
    data: {
      status: "FAILED",
      providerCheckoutId: stringValue(session.id),
    },
  });
  return NextResponse.json({ ok: true, paymentStatus: "FAILED" });
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

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    return handleCheckoutSessionCompleted(event);
  }
  if (event.type === "checkout.session.async_payment_failed") {
    return handleCheckoutSessionAsyncPaymentFailed(event);
  }
  if (event.type === "checkout.session.expired") {
    return handleCheckoutSessionExpired(event);
  }
  if (
    event.type === "refund.updated" ||
    event.type === "refund.failed" ||
    event.type === "charge.refund.updated"
  ) {
    return handleRefundStatusChanged(event);
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
