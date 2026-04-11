import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { beginnerLevelFileSchema, studyAssessmentItemsJsonSchema } from "../study/schemas";

describe("beginnerLevelFileSchema", () => {
  it("parses committed beginner-1.json", () => {
    const fp = path.join(__dirname, "../../../data/study/beginner-1.json");
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = beginnerLevelFileSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decks.length).toBeGreaterThan(0);
      expect(parsed.data.assessment.items.length).toBeGreaterThan(0);
    }
  });
});

describe("studyAssessmentItemsJsonSchema", () => {
  it("accepts items wrapper", () => {
    const parsed = studyAssessmentItemsJsonSchema.safeParse({
      items: [
        {
          id: "x",
          promptJa: "p",
          promptEn: "p",
          options: ["a", "b"],
          correctIndex: 0,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
