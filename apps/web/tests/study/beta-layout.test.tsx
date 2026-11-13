// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
const state = vi.hoisted(() => ({ language: "JAPANESE", locale: "en" }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale,
  getTranslations: async () => (key: string) => (state.locale === "ja" ? ja : en).japaneseStudy[key as keyof typeof en.japaneseStudy] }));
vi.mock("@/lib/onboarding-gate", () => ({ requireAuth: async () => ({ id: "student", learningLanguage: "ENGLISH" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/study/page-access", () => ({ getStudyPageActor: async () => ({ learningLanguage: state.language }) }));
import StudyLayout from "@/app/[locale]/learn/study/layout";
afterEach(cleanup);
test.each(["en", "ja"])("Japanese flashcard pages carry the localized beta ribbon and source notice (%s)", async locale => {
  state.language = "JAPANESE"; state.locale = locale;
  render(await StudyLayout({ children: <main>Study content</main> }));
  expect(screen.getByText(locale === "ja" ? "ベータ版" : "Beta")).toBeVisible();
  expect(screen.getByRole("link", { name: locale === "ja" ? "出典とライセンス" : "Sources and licences" })).toHaveAttribute("href", "/api/japanese-study/attribution");
  expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
  expect(screen.getByRole("main")).toHaveTextContent("Study content");
});
test("English flashcards carry no Japanese beta label even in Japanese UI", async () => {
  state.language = "ENGLISH"; state.locale = "ja";
  render(await StudyLayout({ children: <main>English practice</main> }));
  expect(screen.queryByText("ベータ版")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByRole("main")).toHaveTextContent("English practice");
});
