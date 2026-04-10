import { describe, expect, test } from "vitest";
import { getReceiptKey } from "@/lib/chat-receipts";

describe("getReceiptKey", () => {
  test("returns delivered when readAt is null", () => {
    expect(getReceiptKey(null)).toBe("delivered");
  });

  test("returns read when readAt is present", () => {
    expect(getReceiptKey("2026-04-10T00:00:00.000Z")).toBe("read");
  });
});
