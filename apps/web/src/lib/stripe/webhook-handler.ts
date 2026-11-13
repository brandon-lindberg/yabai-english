import { NextResponse } from "next/server";
import type { PrismaClient } from "@/generated/prisma/client";
import { syncAndNotifyTeacherPaymentAccount } from "@/lib/stripe/sync-and-notify-teacher-payment-account";
import { confirmBookingFromStripeCheckoutSession } from "@/lib/stripe/confirm-booking-from-stripe-checkout";
import { stripeAccountForPayment } from "./payment-account";
import { recordStripeRefund, queuePaymentReconciliation, processPaymentRecovery, providerObjectId, paymentForStripeIntent } from "../payment-recovery";
import { retrieveStripeRefund, listStripeRefundsForPayment, retrieveStripeApplicationFee, retrieveStripeCharge } from "./stripe-connect";

export type StripeEventLike = {
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

async function syncConnectedAccountFromWebhook(db: PrismaClient, event: StripeEventLike) {
  const stripeAccount = event.data.object;
  const providerAccountId = stringValue(stripeAccount.id) ?? event.account;
  if (!providerAccountId) return null;

  const paymentAccount = await db.teacherPaymentAccount.findFirst({
    where: { provider: "STRIPE", providerAccountId },
    select: { id: true },
  });
  if (!paymentAccount) return null;

  return syncAndNotifyTeacherPaymentAccount({
    paymentAccountId: paymentAccount.id,
    stripeAccount: {
      charges_enabled: Boolean(stripeAccount.charges_enabled),
      payouts_enabled: Boolean(stripeAccount.payouts_enabled),
      // Omitting this is what made every webhook-observed account look like it
      // had never finished onboarding, review or not.
      details_submitted: Boolean(stripeAccount.details_submitted),
      requirements: stripeAccount.requirements as never,
      capabilities: stripeAccount.capabilities as never,
    },
  });
}

async function disableConnectedAccountFromWebhook(db: PrismaClient, event: StripeEventLike) {
  const providerAccountId =
    event.account ??
    stringValue(event.data.object.account) ??
    stringValue(event.data.object.id);
  if (!providerAccountId) return null;

  const accounts = await db.teacherPaymentAccount.findMany({
    where: { provider: "STRIPE", providerAccountId },
    select: { id: true },
  });
  if (accounts.length === 0) return null;
  const accountIds = accounts.map((account) => account.id);

  await db.teacherPaymentMethod.updateMany({
    where: { accountId: { in: accountIds } },
    data: { enabled: false },
  });
  const updated = await db.teacherPaymentAccount.updateMany({
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

async function handleCheckoutSessionCompleted(db: PrismaClient, event: StripeEventLike) {
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
    amount_total: typeof session.amount_total === "number" ? session.amount_total : undefined,
    currency: stringValue(session.currency),
  }, { connectedAccountId: event.account });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    bookingStatus: result.bookingStatus,
    alreadyConfirmed: result.alreadyConfirmed,
  });
}

async function handleCheckoutSessionExpired(db: PrismaClient, event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

  if (!await checkoutBelongsToPayment(db, event)) return NextResponse.json({ error: "Checkout payment/account mismatch" }, { status: 409 });

  await db.payment.updateMany({
    where: { id: paymentId, status: { notIn: ["SUCCEEDED", "REFUNDED"] } },
    data: {
      status: "EXPIRED",
      providerCheckoutId: stringValue(session.id),
    },
  });
  return NextResponse.json({ ok: true, paymentStatus: "EXPIRED" });
}

async function handleCheckoutSessionAsyncPaymentFailed(db: PrismaClient, event: StripeEventLike) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const paymentId = stringValue(metadata.paymentId);
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });
  if (!await checkoutBelongsToPayment(db, event)) return NextResponse.json({ error: "Checkout payment/account mismatch" }, { status: 409 });

  await db.payment.updateMany({
    where: { id: paymentId, status: { notIn: ["SUCCEEDED", "REFUNDED"] } },
    data: {
      status: "FAILED",
      providerCheckoutId: stringValue(session.id),
    },
  });
  return NextResponse.json({ ok: true, paymentStatus: "FAILED" });
}

async function checkoutBelongsToPayment(db: PrismaClient, event: StripeEventLike) {
  const session = event.data.object, metadata = session.metadata as Record<string, unknown> | undefined;
  const id = stringValue(metadata?.paymentId);
  if (!id || !event.account) return false;
  const payment = await db.payment.findUnique({ where: { id }, include: { teacherPaymentAccount: true } });
  return payment?.provider === "STRIPE" && stripeAccountForPayment(payment) === event.account
    && payment.providerCheckoutId === stringValue(session.id);
}

export async function dispatchStripeWebhook(db: PrismaClient, event: StripeEventLike) {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return handleCheckoutSessionCompleted(db, event);
  if (event.type === "checkout.session.expired") return handleCheckoutSessionExpired(db, event);
  if (event.type === "checkout.session.async_payment_failed") return handleCheckoutSessionAsyncPaymentFailed(db, event);
  if (["refund.created", "refund.updated", "refund.failed", "charge.refund.updated", "charge.refunded"].includes(event.type)) {
    if (!event.account) return NextResponse.json({ ok: true, ignored: true });
    const object = event.data.object;
    const refunds = event.type === "charge.refunded"
      ? await listStripeRefundsForPayment(event.account, providerObjectId(object.payment_intent) ?? providerObjectId((await retrieveStripeCharge(event.account, String(object.id))).payment_intent) ?? "")
      : [await retrieveStripeRefund(event.account, String(object.id))];
    const payments = new Set<string>();
    for (const refund of refunds) {
      const stored = await recordStripeRefund(db, event.account, refund);
      if (stored) payments.add(stored.paymentId);
    }
    for (const id of payments) await processPaymentRecovery(db, id, { force: true });
    return NextResponse.json({ ok: true, reconciled: payments.size });
  }
  if (["application_fee.refunded", "application_fee.refund.updated"].includes(event.type)) {
    const object = event.data.object;
    const feeId = event.type === "application_fee.refunded" ? providerObjectId(object.id) : providerObjectId(object.fee);
    if (!feeId) return NextResponse.json({ ok: true, ignored: true });
    const fee = await retrieveStripeApplicationFee(feeId);
    const account = providerObjectId(fee.account), charge = providerObjectId(fee.charge);
    if (!account || !charge) return NextResponse.json({ ok: true, ignored: true });
    const intent = providerObjectId((await retrieveStripeCharge(account, charge)).payment_intent);
    const payment = intent ? await paymentForStripeIntent(db, account, intent) : null;
    if (payment) {
      await db.$transaction(tx => queuePaymentReconciliation(tx, payment.id));
      await processPaymentRecovery(db, payment.id, { force: true });
    }
    return NextResponse.json({ ok: true });
  }
  if (event.type === "account.updated") await syncConnectedAccountFromWebhook(db, event);
  if (event.type === "account.application.deauthorized") await disableConnectedAccountFromWebhook(db, event);
  return NextResponse.json({ ok: true });
}

