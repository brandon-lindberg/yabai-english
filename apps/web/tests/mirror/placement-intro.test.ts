// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { ENGLISH_PLACEMENT_POLICY_V2 } from "@/lib/placement-policy";
import PlacementPage from "@/app/[locale]/placement/page";

const context = vi.hoisted(() => ({ locale: "en" as "en" | "ja" }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => createTranslator({ locale: context.locale, messages: context.locale === "en" ? en : ja, namespace: "placement" }) }));
vi.mock("@/components/placement-quiz", () => ({ PlacementQuiz: () => null }));
vi.mock("@/components/onboarding-resume-banner", () => ({ OnboardingResumeBanner: () => null }));
afterEach(cleanup);

test.each(["en", "ja"] as const)("the %s opening explains the actual assessment time limit", async locale => {
  context.locale = locale;
  render(await PlacementPage({ searchParams: Promise.resolve({}) }));
  const minutes = ENGLISH_PLACEMENT_POLICY_V2.timeLimitSec / 60;
  expect(screen.getByText(new RegExp(locale === "ja" ? `制限時間は${minutes}分` : `You have ${minutes} minutes`))).toBeInTheDocument();
});
