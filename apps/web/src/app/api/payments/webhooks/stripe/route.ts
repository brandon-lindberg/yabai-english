import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { constructStripeWebhookEvent } from "@/lib/stripe/stripe-connect";
import { receiveStripeWebhook } from "@/lib/stripe/webhook-work";
import type { StripeEventLike } from "@/lib/stripe/webhook-handler";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 401 });
  let event: StripeEventLike;
  try { event = constructStripeWebhookEvent(rawBody, signature) as unknown as StripeEventLike; }
  catch { return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 }); }
  if (!event.id || !event.type || !event.data?.object) return NextResponse.json({ error: "Invalid Stripe event" }, { status: 400 });
  return receiveStripeWebhook(prisma, event);
}
