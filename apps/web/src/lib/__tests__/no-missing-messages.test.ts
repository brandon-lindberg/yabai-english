import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";

/**
 * Every `t("key")` a page asks for must exist in both locales.
 *
 * `next-intl` throws `MISSING_MESSAGE` at render time, so a namespace that is
 * missing one key takes the page down — and only for whoever opens that page,
 * in that locale. Nothing before this caught it: the key is a string, so
 * TypeScript is happy, and the build renders no route that needs it.
 *
 * This shipped. Six school pages were written from one template on the
 * assumption that every namespace had `title` and `description`; `settingsPage`
 * had only `title`, and `/org/<id>/schools/<id>/settings` threw on open.
 */

type Messages = Record<string, unknown>;

function resolve(messages: Messages, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object" ? (node as Messages)[key] : undefined,
      messages,
    );
}

/** Files that render a page or layout, which are the ones that can throw. */
function pageFiles(): string[] {
  const out = execSync(
    "grep -rl 'getTranslations(' src/app --include=page.tsx --include=layout.tsx || true",
    { encoding: "utf8" },
  ).trim();
  return out ? out.split("\n") : [];
}

/**
 * `const t = await getTranslations("ns")` … `t("key")`.
 *
 * Deliberately only literal keys: a template literal is resolved at runtime and
 * cannot be checked here without evaluating it.
 */
function literalKeysIn(source: string): string[] {
  const namespaces = [
    ...source.matchAll(/const\s+(\w+)\s*=\s*await\s+getTranslations\(\s*"([^"]+)"\s*\)/g),
  ];
  const keys: string[] = [];
  for (const [, varName, namespace] of namespaces) {
    const call = new RegExp(`\\b${varName}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
    for (const [, key] of source.matchAll(call)) {
      keys.push(`${namespace}.${key}`);
    }
  }
  return keys;
}

describe("page message keys resolve", () => {
  const files = pageFiles();

  test("there are pages to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const locale of [
    { name: "en", messages: en as Messages },
    { name: "ja", messages: ja as Messages },
  ]) {
    test(`every literal key a page asks for exists in ${locale.name}`, () => {
      const missing: string[] = [];
      for (const file of files) {
        for (const path of literalKeysIn(readFileSync(file, "utf8"))) {
          if (resolve(locale.messages, path) === undefined) {
            missing.push(`${file} → ${path}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });
  }
});
