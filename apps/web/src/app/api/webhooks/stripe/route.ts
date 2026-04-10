import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, {
      status: 503,
    });
  }

  const body = await req.text();
  const hdrs = await headers();
  const sig = hdrs.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const creditsRaw = session.metadata?.credits;
      const credits = creditsRaw ? parseInt(creditsRaw, 10) : 0;
      if (userId && credits > 0) {
        await prisma.$transaction(async (tx) => {
          const profile = await tx.studentProfile.findUnique({
            where: { userId },
          });
          if (!profile) return;
          const newBalance = profile.lessonCredits + credits;
          await tx.studentProfile.update({
            where: { userId },
            data: { lessonCredits: newBalance },
          });
          await tx.creditTransaction.create({
            data: {
              userId,
              type: "PURCHASE",
              amount: credits,
              balanceAfter: newBalance,
              description: "Stripe checkout",
              stripeCheckoutSessionId: session.id,
            },
          });
        });
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  await prisma.stripeWebhookEvent.create({
    data: { stripeEventId: event.id },
  });

  return NextResponse.json({ received: true });
}
