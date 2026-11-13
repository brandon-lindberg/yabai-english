import { useTranslations } from "next-intl";
import type { RefundStatus } from "@/generated/prisma/enums";
import { Status } from "@/components/ui/status";

const states = {
  PENDING_RECOVERY: ["statusPendingRecovery", "error"],
  FAILED: ["statusFailed", "error"],
  PENDING: ["statusPending", "pending"],
  SUCCEEDED: ["statusSucceeded", "settled"],
} as const;

export function AdminRefundStatus({ status, feeOnly }: { status: RefundStatus | null; feeOnly?: boolean }) {
  const t = useTranslations("admin.refundsPage");
  const [label, tone] = states[status ?? "PENDING_RECOVERY"];
  return <Status tone={feeOnly ? "pending" : tone}>{t(feeOnly ? "statusFeeRecovery" : label)}</Status>;
}
