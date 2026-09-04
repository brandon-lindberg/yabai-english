import { describe, expect, test } from "vitest";
import {
  LEARNING_GOALS,
  normalizeLearningGoals,
} from "@/lib/student-learning-goals";

/*
  Goals were collected once during onboarding and then frozen: the student's own
  profile form only ever edited their name and bio. Teachers read those goals to
  plan lessons, so a student whose aim moved from travel to an exam had no way to
  say so, and the teacher was working from whatever they picked on day one.

  The list itself lived as a private constant inside the onboarding wizard. Two
  places offer it now, so it lives in one.
*/

describe("student learning goals", () => {
  test("offers the same four the wizard always did", () => {
    expect(LEARNING_GOALS.map((goal) => goal.id)).toEqual([
      "conversation",
      "business",
      "exam",
      "travel",
    ]);
  });

  test("keeps what was chosen, in the order offered", () => {
    // Stable order so the profile does not reshuffle itself between saves.
    expect(normalizeLearningGoals(["travel", "conversation"])).toEqual([
      "conversation",
      "travel",
    ]);
  });

  test("drops anything not on the list", () => {
    // The value reaches the server from a client that could send anything.
    expect(normalizeLearningGoals(["conversation", "hacking"])).toEqual(["conversation"]);
  });

  test("drops duplicates", () => {
    expect(normalizeLearningGoals(["exam", "exam"])).toEqual(["exam"]);
  });

  test("an empty choice is a legitimate answer", () => {
    // Clearing every goal says something; it is not an error to be rejected.
    expect(normalizeLearningGoals([])).toEqual([]);
  });
});
