// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "../../../../../../messages/en.json";
import SignInPage from "../page";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), site: vi.fn(), start: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/learning-site-request", () => ({ getRequestLearningSite: mocks.site }));
vi.mock("@/lib/learning-journey-actions", () => ({ startGoogleSignIn: mocks.start }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: "auth" | "learningJourney") => (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], en[namespace]),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const origin = "https://japanesestudio.love";
const page = (query: { callbackUrl?: string; siteSession?: string } = {}) => SignInPage({ searchParams: Promise.resolve(query) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LEARNING_SITES_ENABLED", "true");
  vi.stubEnv("ENGLISH_SITE_URL", "https://englishstudiojapan.com");
  vi.stubEnv("JAPANESE_SITE_URL", origin);
  vi.stubEnv("AUTH_GOOGLE_ID", "example-google-client");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "example-google-secret");
  mocks.auth.mockResolvedValue(null);
  mocks.site.mockResolvedValue({ origin, learningLanguage: "JAPANESE" });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

test("a signed-out user sees a Google confirmation and the app waits for them to continue", async () => {
  render(<NextIntlClientProvider locale="en" messages={en}>{await page({ siteSession: "skip", callbackUrl: "/en/dashboard/schedule" })}</NextIntlClientProvider>);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.learningJourney.japanese.signin);
  expect(screen.getByRole("button", { name: en.auth.continueWithGoogle })).toBeEnabled();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(mocks.start).not.toHaveBeenCalled();
});

test("the page still checks for a shared login before offering Google", async () => {
  await expect(page({ callbackUrl: "/en/dashboard/schedule" })).rejects.toThrow("REDIRECT:https://japanesestudio.love/api/auth/site-session?flow=signin&locale=en&returnTo=%2Fen%2Fdashboard%2Fschedule");
  expect(mocks.start).not.toHaveBeenCalled();
});
