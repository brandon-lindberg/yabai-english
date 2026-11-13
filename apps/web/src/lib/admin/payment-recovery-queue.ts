import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { adminPaymentQueueRefundWhere, adminPaymentRecoveryWhere, type AdminPaymentRecoveryQueue } from "@/lib/refund-recovery";

const participant = { id: true, name: true, email: true } as const;

export async function loadAdminPaymentRecoveryQueue(db: PrismaClient, queue: AdminPaymentRecoveryQueue, filters: { booking?: string; person?: string }) {
  const payments = await db.payment.findMany({
    where: adminPaymentRecoveryWhere({ ...filters, queue }),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true, provider: true, updatedAt: true,
      booking: { select: {
        id: true, learningLanguage: true, student: { select: participant }, teacher: { select: { user: { select: participant } } },
      } },
      recovery: { select: { createdAt: true, lastError: true, requestedAmountYen: true } },
      refunds: {
        where: adminPaymentQueueRefundWhere(queue),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { status: true, amountYen: true, recoveryNote: true, providerRefundId: true, createdAt: true },
      },
    },
  });

  return payments.map(({ id, provider, updatedAt, booking, recovery, refunds: [refund] }) => ({
    paymentId: id,
    bookingId: booking?.id ?? null,
    learningLanguage: booking?.learningLanguage ?? null,
    student: booking?.student ?? null,
    teacher: booking?.teacher.user ?? null,
    status: refund?.status ?? null,
    amountYen: queue === "student" ? refund?.amountYen ?? recovery?.requestedAmountYen ?? null : null,
    recoveryNote: recovery?.lastError ?? refund?.recoveryNote ?? null,
    providerRefundId: refund?.providerRefundId ?? null,
    createdAt: (recovery?.createdAt ?? refund?.createdAt ?? updatedAt).toISOString(),
    canRetry: provider === "STRIPE" && Boolean(booking),
  }));
}

export type AdminPaymentRecoveryRow = Awaited<ReturnType<typeof loadAdminPaymentRecoveryQueue>>[number];
