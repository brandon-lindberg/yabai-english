import type { RefundStatus } from "@/generated/prisma/client";

/**
 * Refund states that still owe someone an outcome: the money has not reached
 * the student, or we do not yet know whether it did. `SUCCEEDED` is settled and
 * deliberately absent — the admin queue exists to surface only what needs a
 * human. Ordered most-urgent first.
 */
export const REFUND_RECOVERY_STATUSES = [
  "PENDING_RECOVERY",
  "FAILED",
  "PENDING",
] as const satisfies readonly RefundStatus[];

export type RefundRecoveryStatus = (typeof REFUND_RECOVERY_STATUSES)[number];
