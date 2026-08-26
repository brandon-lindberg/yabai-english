import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A ChatMessage's recipient must always be derived from its thread. These tests
 * pin the write surface so a future call site cannot quietly reintroduce a
 * hand-picked `recipientId` and deliver a message to the wrong person.
 */
const SRC = path.join(process.cwd(), "src");

/** Files allowed to write ChatMessage rows at all. */
const ALLOWED_WRITERS = [
  "src/app/api/chat/threads/[threadId]/messages/route.ts",
  "src/app/api/admin/chat/broadcast/route.ts",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "generated" || entry === "__tests__") return [];
      return sourceFiles(full);
    }
    if (!/\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

const files = sourceFiles(SRC).map((full) => ({
  rel: path.relative(path.join(process.cwd()), full).replace(/\\/g, "/"),
  text: readFileSync(full, "utf8"),
}));

describe("ChatMessage write surface", () => {
  test("only the known routes create chat messages", () => {
    const writers = files
      .filter(({ text }) => /prisma\.chatMessage\.create(Many)?\(/.test(text))
      .map(({ rel }) => rel)
      .sort();

    // If this fails, the new call site must build its rows with
    // chatMessageData() and then be added here deliberately.
    expect(writers).toEqual([...ALLOWED_WRITERS].sort());
  });

  test("no writer hand-picks a recipient in the rows it inserts", () => {
    for (const rel of ALLOWED_WRITERS) {
      const file = files.find((f) => f.rel === rel);
      expect(file, `${rel} not found`).toBeDefined();

      const calls = [...file!.text.matchAll(/prisma\.chatMessage\.create(?:Many)?\(/g)];
      expect(calls.length, `${rel} should still write chat messages`).toBeGreaterThan(0);

      expect(file!.text, `${rel} must build rows with chatMessageData()`).toContain(
        "chatMessageData(",
      );

      for (const call of calls) {
        const end = file!.text.indexOf("});", call.index!);
        const statement = file!.text.slice(call.index!, end);
        expect(
          statement,
          `${rel} must not set recipientId directly — derive it from the thread`,
        ).not.toContain("recipientId");
      }
    }
  });
});
