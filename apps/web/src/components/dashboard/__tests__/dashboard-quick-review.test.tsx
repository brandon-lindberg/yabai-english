// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";
import en from "../../../../messages/en.json";
import { DashboardQuickReview } from "@/components/dashboard/dashboard-quick-review";

/*
  Quick review had three states, and one of them was a paragraph explaining why
  there was nothing to show: "Practice a few flashcards first — quick review
  uses cards you have already answered correctly." A section whose entire
  content is an apology for existing is worth not rendering.

  The other empty-ish state stays: having *cleared* today's cards is a result,
  not an absence, and the student earned the confirmation.
*/

function renderReview(cards: { id: string; frontJa: string; backEn: string }[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardQuickReview
        initialCards={cards}
        dayKey="2026-09-04"
        initialLearnedToday={0}
        initialNotYetToday={0}
      />
    </NextIntlClientProvider>,
  );
}

describe("DashboardQuickReview", () => {
  test("renders nothing at all when there is nothing to review", () => {
    // Not an empty state with a line of explanation — nothing. The copy that
    // used to fill it has been deleted along with it.
    const { container } = renderReview([]);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders when there are cards", () => {
    renderReview([{ id: "c-1", frontJa: "こんにちは", backEn: "Hello" }]);

    expect(screen.getByText(en.dashboard.quickReview.title)).toBeInTheDocument();
  });

  test("brings its own section, so no caller has to wrap it", () => {
    // The dashboard wrapped it in a `<section>`; with the spine's `space-y-10`
    // that wrapper left a 40px hole on every dashboard with nothing to review.
    const { container } = renderReview([{ id: "c-1", frontJa: "犬", backEn: "Dog" }]);

    expect(container.querySelector("section")).not.toBeNull();
  });
});
