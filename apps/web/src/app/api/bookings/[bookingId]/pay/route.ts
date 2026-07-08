import { NextResponse } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPlatformFeeForTeacher } from "@/lib/platform-fees";
import { isLocalStripeProviderAccount } from "@/lib/payment-methods";
import {
  createStripeCheckoutSessionDirectCharge,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";

type Props = {
  params: Promise<{ bookingId: string }>;
};

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: true,
      student: true,
      teacher: { include: { user: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          teacherPaymentAccount: true,
        },
      },
    },
  });

  if (!booking || booking.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "Booking is not pending payment" }, { status: 409 });
  }

  const payment = booking.payments?.[0];
  if (!payment) {
    return NextResponse.json({ error: "Payment session not found" }, { status: 409 });
  }

  if (payment.status === "REQUIRES_ACTION" && payment.providerCheckoutId && payment.checkoutUrl) {
    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      provider: payment.provider,
      method: payment.method,
      checkoutUrl: payment.checkoutUrl,
    });
  }

  if (payment.provider !== "STRIPE") {
    const checkoutId =
      payment.providerCheckoutId ?? `${payment.provider.toLowerCase()}_checkout_${payment.id}`;
    const checkoutUrl = payment.checkoutUrl ?? `/book/checkout/${booking.id}`;
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REQUIRES_ACTION",
        providerCheckoutId: checkoutId,
        checkoutUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      paymentId: updated.id,
      provider: updated.provider,
      method: updated.method,
      checkoutUrl: updated.checkoutUrl,
    });
  }

  if (!stripeConnectConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const connectedAccountId = payment.teacherPaymentAccount?.providerAccountId;
  if (!connectedAccountId || isLocalStripeProviderAccount(connectedAccountId)) {
    return NextResponse.json({ error: "Teacher Stripe account is not connected" }, { status: 409 });
  }

  const fee = await calculateMonthlyPlatformFeeForTeacher(prisma, {
    teacherId: booking.teacherId,
    amountYen: payment.amountYen,
    at: new Date(),
  });
  const baseUrl = appUrl();
  const checkout = await createStripeCheckoutSessionDirectCharge({
    connectedAccountId,
    paymentId: payment.id,
    bookingId: booking.id,
    amountYen: payment.amountYen,
    applicationFeeAmountYen: fee.applicationFeeAmountYen,
    productName: booking.lessonProduct.nameEn,
    customerEmail: booking.student.email,
    successUrl: `${baseUrl}/book/checkout/${booking.id}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/book/checkout/${booking.id}?stripe=cancelled`,
  });
  const paymentIntentId =
    typeof checkout.payment_intent === "string"
      ? checkout.payment_intent
      : checkout.payment_intent?.id ?? null;
  const checkoutUrl = checkout.url;
  if (!checkoutUrl) {
    return NextResponse.json({ error: "Stripe checkout URL was not returned" }, { status: 502 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.paymentLedgerEntry.deleteMany({
      where: {
        paymentId: payment.id,
        type: { in: ["PLATFORM_FEE", "TEACHER_NET"] },
      },
    });
    await tx.paymentLedgerEntry.createMany({
      data: [
        { paymentId: payment.id, type: "PLATFORM_FEE", amountYen: fee.applicationFeeAmountYen },
        {
          paymentId: payment.id,
          type: "TEACHER_NET",
          amountYen: payment.amountYen - fee.applicationFeeAmountYen,
        },
      ],
    });

    return tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "REQUIRES_ACTION",
        providerCheckoutId: checkout.id,
        providerPaymentId: paymentIntentId,
        checkoutUrl,
        metadataJson: {
          chargeType: "DIRECT_CHARGE",
          connectedAccountId,
          feePolicyVersion: fee.feePolicyVersion,
          calculatedTier: fee.calculatedTier,
          effectiveTier: fee.effectiveTier,
          teacherTier: fee.teacherTier,
          overrideActive: fee.overrideActive,
          periodTimeZone: fee.periodTimeZone,
          periodStart: fee.periodStart.toISOString(),
          periodEnd: fee.periodEnd.toISOString(),
          paidLessonOrdinal: fee.paidLessonOrdinal,
          rateBps: fee.rateBps,
          applicationFeeAmountYen: fee.applicationFeeAmountYen,
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    paymentId: updated.id,
    provider: updated.provider,
    method: updated.method,
    checkoutUrl: updated.checkoutUrl,
  });
}
