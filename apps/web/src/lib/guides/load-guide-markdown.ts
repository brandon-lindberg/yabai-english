import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type GuideId = "stripe-onboarding";

const LOCALES = ["en", "ja"] as const;
export type GuideLocale = (typeof LOCALES)[number];

export function isGuideLocale(value: string): value is GuideLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export async function loadGuideMarkdown(guide: GuideId, locale: GuideLocale): Promise<string> {
  const cwd = process.cwd();
  const filePath = path.join(cwd, "src", "content", "guides", `${guide}-${locale}.md`);
  return readFile(filePath, "utf8");
}
