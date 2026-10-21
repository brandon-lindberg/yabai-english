// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import en from "../../../../messages/en.json";
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async (namespace: "landing" | "landingJapanese" | "learningJourney") => createTranslator({ locale: "en", messages: en, namespace }) }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/settle-text", () => ({ SettleText: ({ children }: { children: ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/marketing/storm-field", () => ({ StormField: () => null }));
vi.mock("@/lib/learning-journey-actions", () => ({ selectLearningJourney: vi.fn() }));
import { LandingHero } from "../landing-hero";
afterEach(cleanup);

test.each(["ENGLISH", "JAPANESE"] as const)("%s landing names the subject before signup and preserves it in the signup URL", async (learningLanguage) => {
  render(await LandingHero({ learningLanguage }));
  const subject = learningLanguage === "ENGLISH" ? "English" : "Japanese";
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(`Learn ${subject}`);
  const signup = screen.getByRole("link", { name: `Start learning ${subject}` });
  expect(signup.getAttribute("href")).toContain(`learningLanguage=${learningLanguage}`);
  expect(screen.getByRole("button", { name: `Find ${subject} teachers` })).toBeTruthy();
});
