// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import PlacementPage from "@/app/[locale]/placement/page";

const context = vi.hoisted(() => ({ locale: "en" as "en" | "ja" }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => createTranslator({ locale: context.locale, messages: context.locale === "en" ? en : ja, namespace: "placement" }) }));
vi.mock("@/components/placement-quiz", () => ({ PlacementQuiz: () => null }));
vi.mock("@/components/onboarding-resume-banner", () => ({ OnboardingResumeBanner: () => null }));
afterEach(cleanup);

test.each(["en", "ja"] as const)("the %s page retains its localized placement heading", async locale => {
  context.locale = locale;
  render(await PlacementPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { level: 1, name: (locale === "ja" ? ja : en).placement.title })).toBeInTheDocument();
});
