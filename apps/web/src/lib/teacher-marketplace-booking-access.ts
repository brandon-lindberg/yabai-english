import { z } from "zod";
import type { LearningLanguage } from "@/generated/prisma/enums";

/**
 * Gates direct booking UI/API for teachers who hide from the marketplace.
 * Org membership and chat blocks are enforced separately at call sites.
 */
export function studentMayAccessTeacherBookingFlow(args: {
  marketplaceHidden: boolean;
  viewerStudentId: string | null;
  isStudentOnRoster: boolean;
}): boolean {
  if (!args.marketplaceHidden) return true;
  if (!args.viewerStudentId) return false;
  return args.isStudentOnRoster;
}
export const teacherMarketplaceVisibilityFields = {
  marketplaceHidden: true,
  japaneseMarketplaceHidden: true,
} as const;

export const teacherMarketplaceVisibilityPatch = {
  marketplaceHidden: z.boolean().optional(),
  japaneseMarketplaceHidden: z.boolean().optional(),
};

export function teacherMarketplaceVisibilityKey(language: LearningLanguage) {
  return language === "JAPANESE" ? "japaneseMarketplaceHidden" : "marketplaceHidden";
}

export type TeacherMarketplaceVisibility = Partial<Record<keyof typeof teacherMarketplaceVisibilityFields, boolean>>;

export function teacherMarketplaceRosterOnly(profile: TeacherMarketplaceVisibility, language: LearningLanguage) {
  return profile[teacherMarketplaceVisibilityKey(language)] ?? false;
}
