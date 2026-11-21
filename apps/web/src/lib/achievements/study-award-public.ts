import { z } from "zod";

export const studyAwardsSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  language: z.enum(["ENGLISH", "JAPANESE"]),
  awardedAt: z.string().datetime(),
  title: z.tuple([z.string(), z.string()]),
}).strict()).max(3);

export type StudyAward = z.infer<typeof studyAwardsSchema>[number];
