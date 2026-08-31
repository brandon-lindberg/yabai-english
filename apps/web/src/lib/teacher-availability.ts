import { z } from "zod";
import {
  weeklyTimeRangeOrdered,
  weeklyTimeRangeShape,
} from "@/lib/weekly-time-range";

export const teacherAvailabilityRecurrenceSchema = z.enum(["WEEKLY", "ONE_OFF"]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const teacherAvailabilitySlotSchema = z
  .object({
    ...weeklyTimeRangeShape,
    timezone: z.string().min(1).max(100),
    recurrence: teacherAvailabilityRecurrenceSchema.optional(),
    startsOn: dateOnlySchema.optional().nullable(),
    endsOn: dateOnlySchema.optional().nullable(),
    /** FK to TeacherClassLevel.id — required. */
    classLevelId: z.string().min(1),
    /** FK to TeacherClassType.id — required. */
    classTypeId: z.string().min(1),
    /** FK to TeacherLessonOffering.id — required so class, duration, and price stay linked. */
    teacherLessonOfferingId: z.string().min(1),
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
  .refine((v) => !v.startsOn || !v.endsOn || v.startsOn <= v.endsOn, {
    message: "endsOn must be on or after startsOn",
    path: ["endsOn"],
  })
  // A recurring slot with no end date outlives the teacher's attention: it goes
  // on taking bookings long after they stop opening the app. Every weekly slot
  // carries an end date the teacher has to return and extend.
  .refine(
    (v) => v.recurrence === "ONE_OFF" || (typeof v.endsOn === "string" && v.endsOn.length > 0),
    {
      message: "WEEKLY recurrence requires endsOn",
      path: ["endsOn"],
    },
  );

export const teacherAvailabilitySchema = z.array(teacherAvailabilitySlotSchema).max(100);

export type TeacherAvailabilitySlotInput = z.infer<typeof teacherAvailabilitySlotSchema>;

export function normalizeAvailabilitySlotsInput(input: unknown) {
  return teacherAvailabilitySchema.safeParse(input);
}
