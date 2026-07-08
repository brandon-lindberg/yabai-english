import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmPaidBookingFromPayment } from "@/lib/booking-payment-confirmation";
import {
  paymentWebhookSecretConfigured,
  verifyPaymentWebhookSignature,
} from "@/lib/payment-webhook-signature";

const webhookSchema = z.object({
  provider: z.enum(["STRIPE", "KOMOJU"]),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  paymentId: z.string().min(1),
  providerPaymentId: z.string().min(1).optional(),
  status: z.enum(["SUCCEEDED", "FAILED", "EXPIRED"]),
  payload: z.unknown().optional(),
});

export async function POST(req: Request) {
  // Simulator endpoint for local/dev payment flows. It can mark arbitrary
  // payments as paid, so it must never be reachable in production; real
  // Stripe events go through /api/payments/webhooks/stripe.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.text();
  if (!paymentWebhookSecretConfigured()) {
    return NextResponse.json({ error: "Payment webhook secret is not configured" }, { status: 503 });
  }
  if (!verifyPaymentWebhookSignature(body, req.headers.get("x-payment-webhook-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const json = (() => {
    try {
      return JSON.parse(body || "null");
    } catch {
      return null;
    }
  })();
  const parsed = webhookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = parsed.data;
  const claimed = await prisma.paymentWebhookEvent.createMany({
    data: [{
      provider: data.provider,
      providerEventId: data.eventId,
      eventType: data.eventType,
      payloadJson: data.payload == null ? undefined : data.payload as never,
    }],
    skipDuplicates: true,
  });
  if (claimed.count === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = await prisma.payment.update({
    where: { id: data.paymentId },
    data: {
      status: data.status,
      providerPaymentId: data.providerPaymentId,
      paidAt: data.status === "SUCCEEDED" ? new Date() : undefined,
    },
  });

  if (data.status !== "SUCCEEDED") {
    return NextResponse.json({ ok: true, paymentStatus: payment.status });
  }

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
