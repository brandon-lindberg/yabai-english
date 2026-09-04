// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { LearningGoalsPicker } from "@/components/learning-goals-picker";

/*
  One picker, used by the onboarding wizard and by the student's own profile.
  They asked the same question with two copies of the same markup, which is how
  the profile came to offer editing and the wizard did not — and how a free-text
  goal would have had to be built twice.
*/

function renderPicker(goals: string[] = [], note = "") {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LearningGoalsPicker goals={goals} note={note} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

const goal = (name: string) => screen.getByRole("button", { name });

describe("LearningGoalsPicker", () => {
  test("shows what is already chosen", () => {
    renderPicker(["conversation"]);

    expect(goal(en.onboarding.goalConversation)).toHaveAttribute("aria-pressed", "true");
    expect(goal(en.onboarding.goalTravel)).toHaveAttribute("aria-pressed", "false");
  });

  test("adds a goal without dropping the others", () => {
    // They are aims, not a single choice: someone can be studying for an exam
    // and for travel at once.
    const { onChange } = renderPicker(["conversation"]);

    fireEvent.click(goal(en.onboarding.goalTravel));

    expect(onChange).toHaveBeenCalledWith({
      goals: ["conversation", "travel"],
      note: "",
    });
  });

  test("removes one that was already chosen", () => {
    const { onChange } = renderPicker(["conversation", "travel"]);

    fireEvent.click(goal(en.onboarding.goalConversation));

    expect(onChange).toHaveBeenCalledWith({ goals: ["travel"], note: "" });
  });

  test("takes a goal in the student's own words", () => {
    // The four presets cover the common cases and nothing else.
    const { onChange } = renderPicker(["exam"]);

    fireEvent.change(screen.getByLabelText(en.onboarding.goalOtherLabel), {
      target: { value: "Pass N2 by March" },
    });

    expect(onChange).toHaveBeenCalledWith({ goals: ["exam"], note: "Pass N2 by March" });
  });

  test("caps the note at what the column holds", () => {
    renderPicker();

    expect(screen.getByLabelText(en.onboarding.goalOtherLabel)).toHaveAttribute(
      "maxLength",
      "200",
    );
  });
});
