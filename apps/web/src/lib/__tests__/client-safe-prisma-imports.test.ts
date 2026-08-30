import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The generated Prisma *client* needs node built-ins, so importing any value
 * from it drags `node:module` into whatever bundle reaches it. A `"use client"`
 * component that does so fails the production build — and only there, since
 * typecheck and unit tests never bundle for the browser.
 *
 * Enums are safe: `@/generated/prisma/enums` is a plain constant module.
 */
const SRC = path.join(process.cwd(), "src");
const VALUE_IMPORT = /^\s*import\s+(?!type\b)[^;]*?from\s+["']@\/generated\/prisma\/client["']/m;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "generated" || entry === "__tests__") return [];
      return sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const files = new Map(
  sourceFiles(SRC).map((full) => [full, readFileSync(full, "utf8")] as const),
);

const rel = (full: string) => path.relative(process.cwd(), full).replace(/\\/g, "/");

/**
 * Resolves the `@/…` *value* imports of a file to paths inside src. `import
 * type` edges are erased at build time and cannot pull anything into a bundle,
 * so following them would flag modules that are perfectly safe.
 */
function localImports(text: string): string[] {
  const valueImports = [...text.matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+["'](@\/[^"']+)["']/gm)];
  return valueImports.flatMap((m) => {
    const base = path.join(SRC, m[1]!.slice(2));
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (files.has(candidate)) return [candidate];
    }
    return [];
  });
}

function reachesPrismaClientValue(entry: string): string[] | null {
  const seen = new Set<string>();
  const stack: Array<{ file: string; trail: string[] }> = [{ file: entry, trail: [entry] }];
  while (stack.length > 0) {
    const { file, trail } = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = files.get(file);
    if (!text) continue;
    if (VALUE_IMPORT.test(text)) return trail;
    for (const next of localImports(text)) {
      stack.push({ file: next, trail: [...trail, next] });
    }
  }
  return null;
}

describe("client components never pull in the Prisma runtime", () => {
  const clientComponents = [...files].filter(([, text]) =>
    /^\s*["']use client["']/.test(text),
  );

  test("there are client components to check", () => {
    expect(clientComponents.length).toBeGreaterThan(0);
  });

  test("none of them reaches a value import of the Prisma client", () => {
    const offenders = clientComponents
      .map(([file]) => ({ file, trail: reachesPrismaClientValue(file) }))
      .filter((r) => r.trail !== null)
      .map((r) => r.trail!.map(rel).join("\n    → "));

    // Import `type { … }` from the client, or the value from
    // `@/generated/prisma/enums`, which has no runtime dependencies.
    expect(offenders).toEqual([]);
  });
});
