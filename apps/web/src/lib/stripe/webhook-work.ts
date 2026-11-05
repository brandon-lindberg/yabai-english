import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { dispatchStripeWebhook, type StripeEventLike } from "./webhook-handler";
import { PAYMENT_WORK_LEASE_MS, workRetryAt } from "../payment-recovery";

export async function receiveStripeWebhook(db: PrismaClient, event: StripeEventLike) {
  await db.paymentWebhookEvent.createMany({ data: [{ provider: "STRIPE", providerEventId: event.id,
    eventType: event.type, payloadJson: event as unknown as Prisma.InputJsonValue }], skipDuplicates: true });
  return processStoredStripeWebhook(db, event.id);
}

/** Completion is written only after every durable handler effect succeeds. */
export async function processStoredStripeWebhook(db: PrismaClient, eventId: string, options: { force?: boolean; replayCompleted?: boolean } = {}) {
  const where = { provider: "STRIPE" as const, providerEventId: eventId };
  const stored = await db.paymentWebhookEvent.findUnique({ where: { provider_providerEventId: where } });
  if (!stored) return NextResponse.json({ error: "Missing event" }, { status: 404 });
  const replayable = /^(checkout\.session\.|refund\.|charge\.refund)/.test(stored.eventType);
  if (options.replayCompleted && !replayable) return NextResponse.json({ error: "Historical account events cannot be replayed" }, { status: 409 });
  if (stored.state === "COMPLETE" && !options.replayCompleted) return NextResponse.json({ ok: true, duplicate: true });
  const token = randomUUID(), now = new Date();
  const claim = await db.paymentWebhookEvent.updateMany({ where: { id: stored.id, ...(options.replayCompleted ? {} : { state: { not: "COMPLETE" as const } }),
    ...(options.force ? {} : { nextAttemptAt: { lte: now } }), OR: [{ leaseToken: null }, { leaseExpiresAt: { lte: now } }] },
    data: { state: "PROCESSING", leaseToken: token, leaseExpiresAt: new Date(Date.now() + PAYMENT_WORK_LEASE_MS), attempts: { increment: 1 }, lastError: null } });
  if (!claim.count) return NextResponse.json({ error: "Event is awaiting retry or already processing" }, { status: 503, headers: { "Retry-After": "15" } });
  try {
    const response = await dispatchStripeWebhook(db, stored.payloadJson as unknown as StripeEventLike);
    if (response.status >= 400) throw new Error(`Stripe handler returned ${response.status}: ${await response.clone().text()}`);
    const completed = await db.paymentWebhookEvent.updateMany({ where: { id: stored.id, leaseToken: token },
      data: { state: "COMPLETE", completedAt: new Date(), leaseToken: null, leaseExpiresAt: null, lastError: null } });
    if (!completed.count) return NextResponse.json({ error: "The recovery lease changed; delivery remains retryable" }, { status: 503 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.paymentWebhookEvent.updateMany({ where: { id: stored.id, leaseToken: token }, data: { state: "WAITING",
      completedAt: null, leaseToken: null, leaseExpiresAt: null, lastError: message, nextAttemptAt: workRetryAt(stored.attempts + 1) } });
    return NextResponse.json({ error: "Stripe event saved for retry" }, { status: 503 });
  }
}
