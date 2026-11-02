import type { CancellationPolicyResult } from "./booking-policy";
import type { ReschedulePolicyResult } from "./booking-reschedule";

export type BookingCancellationPreview = {
  policy: CancellationPolicyResult;
  studentPrivate: boolean;
  reschedule: ReschedulePolicyResult | null;
  timeZone: string;
  refundAmountYen: number;
};
