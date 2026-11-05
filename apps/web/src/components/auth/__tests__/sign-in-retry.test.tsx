// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import SignInErrorPage from "@/app/[locale]/auth/error/page";

const { recover, start } = vi.hoisted(() => ({ recover: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/learning-sign-in", () => ({ recoverLearningSignInIntent: recover }));
vi.mock("@/lib/learning-journey-actions", () => ({ startGoogleSignIn: start }));
vi.mock("../google-sign-in-form", () => ({
  GoogleSignInForm: ({ action, autoRetry }: { action: () => Promise<void>; autoRetry: boolean }) =>
    <button data-auto-retry={String(autoRetry)} onClick={() => void action()}>{en.auth.continueWithGoogle}</button>,
}));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async ({ namespace }: { namespace: "auth" | "learningJourney" }) => (key: string) => (en[namespace] as Record<string, string>)[key],
}));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const intent = { learningLanguage: "JAPANESE", locale: "en", callbackUrl: "/en/book" };
const page = (error: string) => SignInErrorPage({ searchParams: Promise.resolve({ error }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_GOOGLE_ID", "test-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-secret");
  recover.mockResolvedValue(intent);
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

test("the first recoverable Google error retries with the original subject and callback", async () => {
  render(await page("Configuration"));
  const button = screen.getByRole("button", { name: en.auth.continueWithGoogle });
  expect(button).toHaveAttribute("data-auto-retry", "true");
  fireEvent.click(button);
  expect(start).toHaveBeenCalledWith({ ...intent, retried: true });
});

test("a repeated failure offers a manual Google retry", async () => {
  recover.mockResolvedValue({ ...intent, retried: true });
  render(await page("Configuration"));
  expect(screen.getByRole("alert")).toHaveTextContent(en.auth.signInRetry);
  expect(screen.getByRole("button", { name: en.auth.continueWithGoogle })).toHaveAttribute("data-auto-retry", "false");
});

test("a denied account sees the reason and a way home", async () => {
  render(await page("AccessDenied"));
  expect(screen.getByRole("alert")).toHaveTextContent(en.auth.signInDenied);
  expect(screen.getByRole("link", { name: en.auth.backToHome })).toBeVisible();
  expect(screen.queryByRole("button", { name: en.auth.continueWithGoogle })).toBeNull();
});
