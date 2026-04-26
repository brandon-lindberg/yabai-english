import { z } from "zod";
import {
  weeklyTimeRangeOrdered,
  weeklyTimeRangeShape,
} from "@/lib/weekly-time-range";

export const recurrencePatternSchema = z.enum(["WEEKLY", "DAILY", "ONE_OFF"]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/**
 * Validates the input shape for a SchoolScheduleSlot.
 *
 * Time-range bounds (`dayOfWeek`, `startMin`, `endMin`) reuse the shared
 * `weeklyTimeRangeShape` so school slots and teacher availability stay in sync
 * on basic field rules. School-only fields (duration, capacity, taxonomy FKs,
 * recurrence pattern, multi-day selection, date bounds) are added on top.
 *
 * Taxonomy fields are optional at the schema layer for now — server-side code
 * may require them for specific schools. (Schools opt into requiring a class
 * level/type via SchoolClassLevel / SchoolClassType configuration.)
 *
 * Recurrence rules:
 * - WEEKLY: `daysOfWeek` may list 1+ weekdays (0-6). When empty/omitted,
 *   the single `dayOfWeek` is used.
 * - DAILY: `dayOfWeek` is ignored at expansion time but kept for legacy
 *   compatibility; clients should send 0.
 * - ONE_OFF: `startsOn` (YYYY-MM-DD) is required and identifies the single date.
 */
export const schoolScheduleSlotInputSchema = z
  .object({
    ...weeklyTimeRangeShape,
    durationMin: z.number().int().min(1),
    capacity: z.number().int().min(1).max(100),
    classLevelId: z.string().min(1).optional().nullable(),
    classTypeId: z.string().min(1).optional().nullable(),
    recurrence: recurrencePatternSchema.optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    startsOn: dateOnlySchema.optional().nullable(),
    endsOn: dateOnlySchema.optional().nullable(),
  })
  .refine(weeklyTimeRangeOrdered, {
    message: "endMin must be greater than startMin",
    path: ["endMin"],
  })
  .refine(
    (v) => v.recurrence !== "ONE_OFF" || (typeof v.startsOn === "string" && v.startsOn.length > 0),
    {
      message: "ONE_OFF recurrence requires startsOn",
      path: ["startsOn"],
    },
  )
  .refine(
    (v) => !v.startsOn || !v.endsOn || v.startsOn <= v.endsOn,
    {
      message: "endsOn must be on or after startsOn",
      path: ["endsOn"],
    },
  );

export type SchoolScheduleSlotInput = z.infer<typeof schoolScheduleSlotInputSchema>;
