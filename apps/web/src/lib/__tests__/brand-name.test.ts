import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { APP_NAME, ICS_PRODUCT_ID, lessonCalendarLocation } from "@/lib/brand";

/**
 * The product is "English Studio Japan". An unrelated business trades as
 * "English Studio", so the bare name must never reach a user-visible surface —
 * not in the UI, not in page metadata, not in an exported calendar file.
 */
const BARE_NAME = /English Studio(?! Japan)/;

function repoFile(...segments: string[]): string {
  return readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

function stringsIn(value: unknown, trail: string[] = []): Array<[string, string]> {
  if (typeof value === "string") return [[trail.join("."), value]];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      stringsIn(child, [...trail, key]),
    );
  }
  return [];
}

describe("brand name", () => {
  test("is the full name everywhere it is declared", () => {
    expect(APP_NAME).toBe("English Studio Japan");
    expect(ICS_PRODUCT_ID).not.toMatch(BARE_NAME);
    expect(lessonCalendarLocation()).not.toMatch(BARE_NAME);
  });

  test.each([
    ["en", en],
    ["ja", ja],
  ])("no %s message uses the bare name", (_locale, messages) => {
    const offenders = stringsIn(messages)
      .filter(([, copy]) => BARE_NAME.test(copy))
      .map(([key]) => key);

    expect(offenders).toEqual([]);
  });

  test("the app name comes from one place in both locales", () => {
    expect(en.common.appName).toBe(APP_NAME);
    expect(ja.common.appName).toBe(APP_NAME);
  });

  test("no user-visible manifest or metadata uses the bare name", () => {
    expect(repoFile("public", "manifest.json")).not.toMatch(BARE_NAME);
    expect(repoFile("src", "app", "layout.tsx")).not.toMatch(BARE_NAME);
  });
});
