import { z } from "zod";

export const teacherAvailabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(1).max(1440),
    timezone: z.string().min(1).max(100),
  })
  .refine((slot) => slot.endMin > slot.startMin, {
    message: "endMin must be greater than startMin",
    path: ["endMin"],
  });

export const teacherAvailabilitySchema = z.array(teacherAvailabilitySlotSchema).max(100);

export type TeacherAvailabilitySlotInput = z.infer<typeof teacherAvailabilitySlotSchema>;

export function normalizeAvailabilitySlotsInput(input: unknown) {
  return teacherAvailabilitySchema.safeParse(input);
}
