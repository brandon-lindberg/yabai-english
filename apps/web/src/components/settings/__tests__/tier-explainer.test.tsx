// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, test } from "vitest";
import en from "../../../../messages/en.json";
import ja from "../../../../messages/ja.json";
import { TierExplainer } from "../tier-explainer";
import { resolveRecommendedTeacherTier } from "@/lib/teacher-tiers";
import { resolveTierRateBps } from "@/lib/platform-fees";

beforeAll(() => {
  // jsdom ships no <dialog> behaviour, and the Modal primitive drives the real
  // element. Stub only the open/close calls so the content still mounts.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

function renderExplainer(locale: "en" | "ja" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : ja}>
      <TierExplainer />
    </NextIntlClientProvider>,
  );
}

const copy = en.dashboard.settingsPage.tierExplainer;

describe("TierExplainer", () => {
  // The Modal primitive always renders its children and lets the native
  // <dialog> hide and inert them, so open/closed is `dialog.open` — not whether
  // the text is in the DOM.
  const dialog = () => document.querySelector("dialog");

  test("stays closed until the teacher asks for it", () => {
    renderExplainer();

    expect(screen.getByRole("button", { name: copy.trigger })).toBeInTheDocument();
    expect(dialog()?.open).toBe(false);
  });

  test("opens on the trigger and explains fees, reviews and movement", () => {
    renderExplainer();

    fireEvent.click(screen.getByRole("button", { name: copy.trigger }));

    // The three questions the tier tab could not answer on its own.
    expect(screen.getByText(copy.feesIntro)).toBeInTheDocument();
    expect(screen.getByText(copy.calcIntro)).toBeInTheDocument();
    expect(screen.getByText(copy.movementAnnual)).toBeInTheDocument();
  });

  test("reads the fee schedule from the marketplace notice, not a second copy", () => {
    renderExplainer();

    fireEvent.click(screen.getByRole("button", { name: copy.trigger }));

    // Same keys the economics notice uses, so a rate change moves both at once.
    const economics = en.dashboard.settingsPage.marketplaceEconomics;
    expect(screen.getByText(economics.tier1Schedule)).toBeInTheDocument();
    expect(screen.getByText(economics.tier2Schedule)).toBeInTheDocument();
    expect(screen.getByText(economics.tier3Schedule)).toBeInTheDocument();
  });

  test("closes again", () => {
    renderExplainer();

    fireEvent.click(screen.getByRole("button", { name: copy.trigger }));
    expect(dialog()?.open).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(dialog()?.open).toBe(false);
  });

  test("is fully translated", () => {
    renderExplainer("ja");

    const jaCopy = ja.dashboard.settingsPage.tierExplainer;
    expect(Object.keys(jaCopy).sort()).toEqual(Object.keys(copy).sort());
    expect(screen.getByRole("button", { name: jaCopy.trigger })).toBeInTheDocument();
  });
});

/*
  An explainer that drifts from the code it explains is worse than none: a
  teacher would budget against numbers that no longer apply. These pin the two
  rules the copy states outright, so changing a threshold fails here and points
  at the sentence that needs rewriting.
*/
describe("tier explainer copy matches the rules it describes", () => {
  test("the stated averages are the thresholds the code uses", () => {
    expect(copy.calcTier1).toContain("5 or fewer");
    expect(resolveRecommendedTeacherTier(5)).toBe("TIER_1");
    expect(resolveRecommendedTeacherTier(5.1)).toBe("TIER_2");

    expect(copy.calcTier2).toContain("up to 10");
    expect(resolveRecommendedTeacherTier(10)).toBe("TIER_2");

    expect(copy.calcTier3).toContain("More than 10");
    expect(resolveRecommendedTeacherTier(10.1)).toBe("TIER_3");
  });

  test("the stated fee schedule is the schedule the code charges", () => {
    // Tier 1: lessons 1-5 at 20%, 6-10 at 15%, 11+ at 10%.
    expect(resolveTierRateBps("TIER_1", 5)).toBe(2000);
    expect(resolveTierRateBps("TIER_1", 6)).toBe(1500);
    expect(resolveTierRateBps("TIER_1", 10)).toBe(1500);
    expect(resolveTierRateBps("TIER_1", 11)).toBe(1000);

    // Tier 2: lessons 1-10 at 15%, 11+ at 10%.
    expect(resolveTierRateBps("TIER_2", 10)).toBe(1500);
    expect(resolveTierRateBps("TIER_2", 11)).toBe(1000);

    // Tier 3: flat 10%.
    expect(resolveTierRateBps("TIER_3", 1)).toBe(1000);
    expect(resolveTierRateBps("TIER_3", 99)).toBe(1000);
  });
});
