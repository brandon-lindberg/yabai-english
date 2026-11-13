import "server-only";
import { NextResponse } from "next/server";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { configuredLearningSites, learningSiteHref } from "./learning-sites";
import { appPathForLocale } from "./i18n-app-path";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getRequestLearningSite } from "./learning-site-request";
import { resolveLearningLanguage } from "./learning-language";

/** Participant authorization runs first; domain context never grants access to a booking. */
export async function bookingLearningSiteResponse(booking: { learningLanguage?: LearningLanguage }, role: string) {
  if (role !== "STUDENT") return null;
  const site = await getRequestLearningSite();
  return site && site.learningLanguage !== resolveLearningLanguage(booking.learningLanguage)
    ? NextResponse.json({ error: "WRONG_LEARNING_SITE" }, { status: 403 }) : null;
}

/** Canonicalize a saved student checkout link before calling any payment finalizer. */
export async function redirectBookingToLearningSite(booking: { learningLanguage: LearningLanguage }, path: string) {
  const sites = configuredLearningSites();
  const site = await getRequestLearningSite();
  if (sites && site && site.learningLanguage !== booking.learningLanguage) {
    redirect(learningSiteHref(sites, booking.learningLanguage, appPathForLocale(await getLocale(), path)));
  }
}
