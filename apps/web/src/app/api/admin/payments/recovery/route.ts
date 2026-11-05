import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recoverPayment } from "@/lib/payment-recovery-batch";
import { processStoredStripeWebhook } from "@/lib/stripe/webhook-work";

const action = z.union([z.object({ paymentId: z.string().min(1) }).strict(), z.object({ eventId: z.string().min(1), replayCompleted: z.literal(true).optional() }).strict()]);
async function authorized() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
export async function GET() {
  const refusal = await authorized(); if (refusal) return refusal;
  const events = await prisma.paymentWebhookEvent.findMany({ where: { provider: "STRIPE", state: { not: "COMPLETE" } }, orderBy: { processedAt: "desc" }, take: 100,
    select: { providerEventId: true, eventType: true, state: true, attempts: true, lastError: true, nextAttemptAt: true } });
  return NextResponse.json({ items: events }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  const refusal = await authorized(); if (refusal) return refusal;
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recovery action" }, { status: 400 });
  if ("eventId" in parsed.data) return processStoredStripeWebhook(prisma, parsed.data.eventId, { force: true, replayCompleted: parsed.data.replayCompleted });
  try {
    const work = await recoverPayment(prisma, parsed.data.paymentId);
    return NextResponse.json({ ok: true, state: work?.state, pending: work?.state !== "COMPLETE" });
  } catch { return NextResponse.json({ error: "This payment could not be reconciled. Its saved recovery work is retained." }, { status: 503 }); }
}
