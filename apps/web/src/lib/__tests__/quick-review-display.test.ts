import { describe, expect, it } from "vitest";
import {
  extractQuickReviewBlankAnswer,
  resolveQuickReviewBackText,
  resolveQuickReviewFrontText,
} from "../study/quick-review-display";

describe("extractQuickReviewBlankAnswer", () => {
  it("extracts the missing answer from a single-blank prompt", () => {
    const front = "The corrected version is ___ instead of the awkward alternative.";
    const back = "The corrected version is we discussed this yesterday instead of the awkward alternative.";
    expect(extractQuickReviewBlankAnswer(front, back)).toBe("we discussed this yesterday");
  });

  it("returns null when the prompt is not a blank template", () => {
    expect(extractQuickReviewBlankAnswer("Translate this sentence.", "Hello there.")).toBeNull();
  });

  it("returns null when back text does not match prompt shape", () => {
    const front = "Use ___ before presentations.";
    const back = "He seems a bit nervous before presentations.";
    expect(extractQuickReviewBlankAnswer(front, back)).toBeNull();
  });
});

describe("resolveQuickReviewBackText", () => {
  it("prefers only the missing answer for blank prompts", () => {
    expect(
      resolveQuickReviewBackText(
        "The corrected version is ___ in high-stakes communication.",
        "The corrected version is if I were you in high-stakes communication.",
      ),
    ).toBe("if I were you");
  });

  it("falls back to full back text when blank extraction fails", () => {
    expect(resolveQuickReviewBackText("Translate: 彼は少し緊張している", "He seems a bit nervous.")).toBe(
      "He seems a bit nervous.",
    );
  });
});

describe("resolveQuickReviewFrontText", () => {
  it("strips instruction labels that precede cloze prompts", () => {
    expect(resolveQuickReviewFrontText('Use "seems": He ___ a bit nervous before presentations.')).toBe(
      "He ___ a bit nervous before presentations.",
    );
  });

  it("keeps non-cloze prompts unchanged", () => {
    expect(resolveQuickReviewFrontText("Translate: 彼は少し緊張している")).toBe(
      "Translate: 彼は少し緊張している",
    );
  });
});
