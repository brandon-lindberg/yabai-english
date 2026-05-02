import { z } from "zod";

/**
 * Shared shape for any weekly time range: a weekday + start/end minutes from local midnight.
 * Used as the base for both teacher-availability slots and school schedule slots so the
 * field-level rules (range bounds, ordering) live in one place.
 */
export const weeklyTimeRangeShape = {
  dayOfWeek: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
} as const;

export const weeklyTimeRangeOrdered = (
  slot: { startMin: number; endMin: number },
): boolean => slot.endMin > slot.startMin;
