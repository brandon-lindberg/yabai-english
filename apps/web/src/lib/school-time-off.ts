import type { TimeOffRequestStatus } from "@/generated/prisma/client";
import { generateOccurrences, type SlotForOccurrences } from "./school-scheduling";

export interface TimeOffDateRange {
  startDate: Date;
  endDate: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a time-off request's date range.
 */
export function validateTimeOffRequest(
  range: TimeOffDateRange,
  now: Date,
): ValidationResult {
  if (range.startDate < now) {
    return { valid: false, error: "Start date cannot be in the past" };
  }
  if (range.endDate < range.startDate) {
    return { valid: false, error: "End date cannot be before start date" };
  }
  return { valid: true };
}

/**
 * Validate a time-off review status transition.
 */
export function validateTimeOffReview(
  currentStatus: TimeOffRequestStatus | string,
  newStatus: TimeOffRequestStatus | string,
): ValidationResult {
  if (currentStatus !== "PENDING") {
    return { valid: false, error: "Can only review requests with PENDING status" };
  }
  if (newStatus !== "APPROVED" && newStatus !== "DENIED") {
    return {
      valid: false,
      error: "Status must be APPROVED or DENIED",
    };
  }
  return { valid: true };
}

/**
 * Find all occurrences of a recurring slot that fall within a time-off date range.
 * Used to auto-generate schedule skips when time off is approved.
 */
export function getAffectedSlotOccurrences(
  slot: SlotForOccurrences,
  startDate: Date,
  endDate: Date,
): { startsAtIso: string }[] {
  return generateOccurrences(slot, startDate, endDate);
}
