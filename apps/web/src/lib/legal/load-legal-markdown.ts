import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type LegalDocId = "terms" | "privacy";

const LOCALES = ["en", "ja"] as const;
export type LegalLocale = (typeof LOCALES)[number];

export function isLegalLocale(value: string): value is LegalLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export async function loadLegalMarkdown(doc: LegalDocId, locale: LegalLocale): Promise<string> {
  const cwd = process.cwd();
  const filePath = path.join(cwd, "src", "content", "legal", `${doc}-${locale}.md`);
  return readFile(filePath, "utf8");
}
