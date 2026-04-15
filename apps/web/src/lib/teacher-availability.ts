import { z } from "zod";
import {
  AVAILABILITY_LESSON_LEVELS,
  AVAILABILITY_LESSON_TYPES,
} from "@/lib/availability-slot-lesson-meta";

export const teacherAvailabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(1).max(1440),
    timezone: z.string().min(1).max(100),
    lessonLevel: z.enum(AVAILABILITY_LESSON_LEVELS),
    lessonType: z.enum(AVAILABILITY_LESSON_TYPES),
    lessonTypeCustom: z.string().max(200).nullable().optional(),
  })
  .refine((slot) => slot.endMin > slot.startMin, {
    message: "endMin must be greater than startMin",
    path: ["endMin"],
  })
  .superRefine((slot, ctx) => {
    if (slot.lessonType !== "custom") return;
    const v = slot.lessonTypeCustom?.trim() ?? "";
    if (!v) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lessonTypeCustom required when lessonType is custom",
        path: ["lessonTypeCustom"],
      });
    }
  });

export const teacherAvailabilitySchema = z.array(teacherAvailabilitySlotSchema).max(100);

export type TeacherAvailabilitySlotInput = z.infer<typeof teacherAvailabilitySlotSchema>;

export function normalizeAvailabilitySlotsInput(input: unknown) {
  return teacherAvailabilitySchema.safeParse(input);
}
