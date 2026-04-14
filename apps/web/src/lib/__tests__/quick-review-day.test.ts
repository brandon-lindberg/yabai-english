import { describe, expect, it } from "vitest";
import {
  formatQuickReviewDayDisplay,
  isQuickReviewCardFrontEligible,
  utcCalendarDayKey,
} from "../study/quick-review";

describe("utcCalendarDayKey", () => {
  it("formats YYYY-MM-DD in UTC", () => {
    expect(utcCalendarDayKey(new Date("2026-04-12T15:30:00.000Z"))).toBe("2026-04-12");
    expect(utcCalendarDayKey(new Date("2026-04-12T23:59:59.999Z"))).toBe("2026-04-12");
    expect(utcCalendarDayKey(new Date("2026-04-13T00:00:00.000Z"))).toBe("2026-04-13");
  });
});

describe("formatQuickReviewDayDisplay", () => {
  it("uses American-style English without UTC wording", () => {
    const s = formatQuickReviewDayDisplay("2026-04-12", "en");
    expect(s).not.toMatch(/UTC/i);
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/Apr|April|4/);
  });

  it("uses Japanese long date without UTC wording", () => {
    const s = formatQuickReviewDayDisplay("2026-04-12", "ja");
    expect(s).not.toMatch(/UTC/i);
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/4|４/);
  });

  it("returns the raw string when not YYYY-MM-DD", () => {
    expect(formatQuickReviewDayDisplay("bad", "en")).toBe("bad");
  });
});

describe("isQuickReviewCardFrontEligible", () => {
  it("excludes cloze prompts with blanks", () => {
    expect(isQuickReviewCardFrontEligible("Choose the best sentence. He likes sports, ___ he doesn't like running.")).toBe(false);
  });

  it("keeps non-cloze prompts", () => {
    expect(isQuickReviewCardFrontEligible("Translate: 彼は少し恥ずかしがり屋だが、優しい。")).toBe(true);
  });
});
