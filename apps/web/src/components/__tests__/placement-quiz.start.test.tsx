// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { PlacementQuiz } from "../placement-quiz";
import { ENGLISH_PLACEMENT_POLICY_V2 } from "@/lib/placement-policy";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), update: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: mocks.update }) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), Link: ({ children, href }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href}>{children}</a> }));
const reply = (body: unknown) => ({ ok: true, json: async () => body });
const active = () => ({ attemptToken: "existing-attempt", expiresAt: Date.now() + 600_000, serverNow: Date.now(),
  question: { id: "one", instructionEn: "Pick one", instructionJa: "選んでください", questionEn: "Choose a response.", optionsEn: ["Yes", "No", "Maybe"] },
  progress: { current: 1, total: 24 } });
const show = (locale: "en" | "ja" = "en") => render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}><PlacementQuiz /></NextIntlClientProvider>);
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test.each(["en", "ja"] as const)("%s explains the check and waits for Start before requesting a question", async locale => {
  mocks.fetch.mockResolvedValueOnce(reply({ status: "ready" })).mockResolvedValueOnce(reply(active()));
  show(locale);
  const start = await screen.findByRole("button", { name: locale === "ja" ? "レベルチェックを始める" : "Start level check" });
  expect(screen.getByText(locale === "ja" ? /スピーキングとリスニング/ : /speaking or listening/)).toBeVisible();
  const minutes = ENGLISH_PLACEMENT_POLICY_V2.timeLimitSec / 60;
  expect(screen.getByText(new RegExp(locale === "ja" ? `制限時間は${minutes}分` : `You have ${minutes} minutes`))).toBeVisible();
  expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  await act(async () => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.fetch.mock.calls[0][1]?.method).not.toBe("POST");
  fireEvent.click(start);
  expect(await screen.findByRole("button", { name: "Yes" })).toBeEnabled();
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({ action: "start" });
  expect(mocks.fetch.mock.calls[1][1].method).toBe("POST");
  expect(mocks.update).not.toHaveBeenCalled();
});

test("leaving and returning to the introduction only reads eligibility", async () => {
  mocks.fetch.mockResolvedValue(reply({ status: "ready" }));
  const first = show();
  await screen.findByRole("button", { name: "Start level check" });
  first.unmount();
  show();
  await screen.findByRole("button", { name: "Start level check" });
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(mocks.fetch.mock.calls.every(([, init]) => !init?.body)).toBe(true);
});

test("an uncertain start can be retried explicitly without automatically looping", async () => {
  mocks.fetch.mockResolvedValueOnce(reply({ status: "ready" })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(active()));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Start level check" }));
  expect(await screen.findByText(en.placement.loadError)).toBeVisible();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: en.placement.startAgain }));
  expect(await screen.findByRole("button", { name: "Yes" })).toBeEnabled();
  expect(JSON.parse(mocks.fetch.mock.calls[2][1].body)).toEqual({ action: "start" });
});

test("retrying a failed introduction read still waits for explicit Start", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply({ status: "ready" }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: en.placement.retryLoad }));
  expect(await screen.findByRole("button", { name: "Start level check" })).toBeEnabled();
  expect(mocks.fetch.mock.calls.every(([, init]) => !init?.body)).toBe(true);
});

test("an existing attempt resumes by reading its saved deadline", async () => {
  const saved = active();
  mocks.fetch.mockResolvedValue(reply(saved));
  show();
  await waitFor(() => expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled());
  expect(screen.queryByRole("button", { name: "Start level check" })).toBeNull();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.fetch.mock.calls[0][1]?.method).not.toBe("POST");
});
