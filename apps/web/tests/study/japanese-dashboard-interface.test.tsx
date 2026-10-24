// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { DashboardJapaneseQuickReview } from "@/components/dashboard/dashboard-japanese-quick-review";
import { studyQuestion, studyQueue, studyResult } from "../../test/japanese-study-ui-fixture";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
const fetchMock = vi.fn();
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const ready = { dayKey: "2026-10-24", total: 1, answered: 0, correct: 0, wrong: 0, xp: 0 };
const daily = (status = ready) => ({ ...status, cards: studyQueue([studyQuestion]).cards });
const show = (status = ready, locale = "en") => render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}><DashboardJapaneseQuickReview initialStatus={status} initialRpg={studyRpgProgressFromTotalXp(0)} /></NextIntlClientProvider>);
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test.each(["en", "ja"])("starts only on request, uses the shared automatic practice view and refreshes summaries after saving (%s)", async locale => {
  fetchMock.mockResolvedValueOnce(reply(daily())).mockResolvedValueOnce(reply(studyResult()));
  show(ready, locale);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: locale === "ja" ? "今日の復習を始める" : "Start today's review" }));
  fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  expect(await screen.findByRole("button", { name: locale === "ja" ? "次のカード" : "Next card" })).toBeVisible();
  expect(fetchMock.mock.calls[0][0]).toBe("/api/japanese-study/quick-review");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  expect(fetchMock.mock.calls[1][0]).toBe("/api/japanese-study/reviews");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).dailyDayKey).toBe(ready.dayKey);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: locale === "ja" ? "次のカード" : "Next card" }));
  expect(await screen.findByText(locale === "ja" ? "今日の復習は完了です" : "Today's review is complete")).toBeVisible();
  expect(screen.queryByRole("button", { name: en.japaneseStudy.anotherSession })).toBeNull();
});

test("a completed daily set stays completed after a dashboard reload", () => {
  show({ ...ready, answered: 1, correct: 1, xp: 12 });
  expect(screen.getByText("Today's review is complete")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Start today's review" })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("resume restores saved daily score and exact uncertain-answer retries", async () => {
  const status = { ...ready, total: 2, answered: 1, correct: 1, xp: 12 };
  fetchMock.mockResolvedValueOnce(reply(daily(status))).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(studyResult()));
  show(status);
  fireEvent.click(screen.getByRole("button", { name: "Resume today's review" }));
  fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry saving answer" }));
  await screen.findByRole("button", { name: "Next card" });
  expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/^\+24 XP today/)).toBeVisible();
});

test("no eligible cards renders no daily-review block and revoked publication stops answering", async () => {
  const empty = show({ ...ready, total: 0 });
  expect(empty.container).toBeEmptyDOMElement(); cleanup();
  fetchMock.mockResolvedValueOnce(reply({ error: "STUDY_UNAVAILABLE" }, 503));
  show(); fireEvent.click(screen.getByRole("button", { name: "Start today's review" }));
  expect(await screen.findByText(en.japaneseStudy.unavailableTitle)).toBeVisible();
  expect(screen.queryByRole("button", { name: "cat" })).toBeNull();
});

test("ignores an incomplete or inconsistent daily response and offers recovery", async () => {
  fetchMock.mockResolvedValueOnce(reply({ ...daily(), answered: 9 }));
  show(); fireEvent.click(screen.getByRole("button", { name: "Start today's review" }));
  expect(await screen.findByRole("button", { name: "Retry" })).toBeVisible();
  await waitFor(() => expect(screen.queryByRole("button", { name: "cat" })).toBeNull());
});
