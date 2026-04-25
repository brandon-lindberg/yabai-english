import { z } from "zod";
import {
  weeklyTimeRangeOrdered,
  weeklyTimeRangeShape,
} from "@/lib/weekly-time-range";

/**
 * Validates the input shape for a SchoolScheduleSlot.
 *
 * Time-range bounds (`dayOfWeek`, `startMin`, `endMin`) reuse the shared
 * `weeklyTimeRangeShape` so school slots and teacher availability stay in sync
 * on basic field rules. School-only fields (duration, capacity, taxonomy FKs)
 * are added on top.
 *
 * Taxonomy fields are optional at the schema layer for now — server-side code
 * may require them for specific schools. (Schools opt into requiring a class
 * level/type via SchoolClassLevel / SchoolClassType configuration.)
 */
export const schoolScheduleSlotInputSchema = z
  .object({
    ...weeklyTimeRangeShape,
    durationMin: z.number().int().min(1),
    capacity: z.number().int().min(1).max(100),
    classLevelId: z.string().min(1).optional().nullable(),
    classTypeId: z.string().min(1).optional().nullable(),
  })
  .refine(weeklyTimeRangeOrdered, {
    message: "endMin must be greater than startMin",
    path: ["endMin"],
  });

export type SchoolScheduleSlotInput = z.infer<typeof schoolScheduleSlotInputSchema>;
