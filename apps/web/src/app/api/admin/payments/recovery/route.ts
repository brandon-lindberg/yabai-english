import { NextResponse } from "next/server";
import { adminWebhookRecoveryWhere } from "@/lib/refund-recovery";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { prisma } from "@/lib/prisma";
import { recoverPayment } from "@/lib/payment-recovery-batch";
import { processStoredStripeWebhook } from "@/lib/stripe/webhook-work";
import { loadAdminPaymentRecoveryQueue } from "@/lib/admin/payment-recovery-queue";

const action = z.union([
  z.object({ paymentId: z.string().min(1), feeOnly: z.literal(true).optional() }).strict(),
  z.object({ eventId: z.string().min(1), replayCompleted: z.literal(true).optional() }).strict(),
]);
const queueQuery = z.object({
  queue: z.enum(["student", "fees"]).optional(),
  booking: z.string().min(1).max(200).optional(),
  person: z.string().min(1).max(200).optional(),
});
const privateResponse = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.error) return gate.error;
  const parsed = queueQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recovery filter" }, { status: 400 });
  const { queue, ...filters } = parsed.data;
  if (queue) return NextResponse.json({ items: await loadAdminPaymentRecoveryQueue(prisma, queue, filters) }, privateResponse);

  const events = await prisma.paymentWebhookEvent.findMany({ where: adminWebhookRecoveryWhere, orderBy: { processedAt: "desc" }, take: 100,
    select: { providerEventId: true, eventType: true, state: true, attempts: true, lastError: true, nextAttemptAt: true } });
  return NextResponse.json({ items: events }, privateResponse);
}
export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.error) return gate.error;
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recovery action" }, { status: 400 });
  if ("eventId" in parsed.data) return processStoredStripeWebhook(prisma, parsed.data.eventId, { force: true, replayCompleted: parsed.data.replayCompleted });
  try {
    const work = await recoverPayment(prisma, parsed.data.paymentId, { feeOnly: parsed.data.feeOnly });
    return NextResponse.json({ ok: true, state: work?.state, pending: work?.state !== "COMPLETE" });
  } catch { return NextResponse.json({ error: "This payment could not be reconciled. Its saved recovery work is retained." }, { status: 503 }); }
}
