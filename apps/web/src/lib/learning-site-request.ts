import "server-only";
import { headers } from "next/headers";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { resolveLearningLanguage } from "./learning-language";
import { configuredLearningSites, learningSiteForHost } from "./learning-sites";

export async function getRequestLearningSite() {
  const sites = configuredLearningSites();
  if (!sites) return null;
  const host = (await headers()).get("host") ?? "";
  const site = learningSiteForHost(host, sites);
  if (!site) throw new Error("Unrecognized learning-site host");
  return site;
}

/** A site's learning context never rewrites the account's saved preference or history. */
export async function learningLanguageForRequest(fallback: unknown): Promise<LearningLanguage> {
  return (await getRequestLearningSite())?.learningLanguage ?? resolveLearningLanguage(fallback);
}
