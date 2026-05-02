import { z } from "zod";
import {
  weeklyTimeRangeOrdered,
  weeklyTimeRangeShape,
} from "@/lib/weekly-time-range";

export const teacherAvailabilitySlotSchema = z
  .object({
    ...weeklyTimeRangeShape,
    timezone: z.string().min(1).max(100),
    /** FK to TeacherClassLevel.id — required. */
    classLevelId: z.string().min(1),
    /** FK to TeacherClassType.id — required. */
    classTypeId: z.string().min(1),
  })
  .refine(weeklyTimeRangeOrdered, {
    message: "endMin must be greater than startMin",
    path: ["endMin"],
  });

export const teacherAvailabilitySchema = z.array(teacherAvailabilitySlotSchema).max(100);

export type TeacherAvailabilitySlotInput = z.infer<typeof teacherAvailabilitySlotSchema>;

export function normalizeAvailabilitySlotsInput(input: unknown) {
  return teacherAvailabilitySchema.safeParse(input);
}
