// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const reviewCards = ["猫", "犬", "山", "川", "海"].map((written, index) => ({
  id: `card-${index}`, feedback: { written, reading: ["ねこ", "いぬ", "やま", "かわ", "うみ"][index], meanings: ["cat", "dog", "mountain", "river", "sea"].slice(index, index + 1) },
}));
const dashboard = (status: typeof ready & { reviewedCards?: typeof reviewCards } = ready, locale = "en") => <NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}><DashboardJapaneseQuickReview initialStatus={{ reviewedCards: [], ...status }} initialRpg={studyRpgProgressFromTotalXp(0)} /></NextIntlClientProvider>;
const show = (...args: Parameters<typeof dashboard>) => render(dashboard(...args));
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test.each(["en", "ja"])("starts only on request, uses the shared automatic practice view and refreshes summaries after saving (%s)", async locale => {
  fetchMock.mockResolvedValueOnce(reply(daily())).mockResolvedValueOnce(reply(studyResult()));
  const view = show(ready, locale);
  const copy = locale === "ja" ? ja : en;
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: locale === "ja" ? "今日の復習を始める" : "Start today's review" }));
  fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  expect(await screen.findByRole("button", { name: copy.japaneseStudy.showDailyDeck })).toBeVisible();
  expect(fetchMock.mock.calls[0][0]).toBe("/api/japanese-study/quick-review");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  expect(fetchMock.mock.calls[1][0]).toBe("/api/japanese-study/reviews");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).dailyDayKey).toBe(ready.dayKey);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: copy.japaneseStudy.showDailyDeck }));
  view.rerender(dashboard({ ...ready, answered: 1, correct: 1, xp: 12, reviewedCards: reviewCards.slice(0, 1) }, locale));
  expect(await screen.findByRole("heading", { name: copy.japaneseStudy.dailyDone })).toHaveFocus();
  expect(screen.getByRole("list", { name: copy.japaneseStudy.dailyDeckLabel })).toBeVisible();
  expect(screen.queryByRole("button", { name: en.japaneseStudy.anotherSession })).toBeNull();
});

test("a completed daily set restores all five flippable cards on the Dashboard", () => {
  show({ ...ready, total: 5, answered: 5, correct: 4, wrong: 1, xp: 48, reviewedCards: reviewCards });
  expect(screen.getByText("Today's review is complete")).toBeVisible();
  const deck = screen.getByRole("list", { name: "Today's review cards" });
  const cards = within(deck).getAllByRole("listitem");
  expect(cards).toHaveLength(5);
  expect(within(cards[0]).getByText("猫")).toBeVisible();
  const front = within(cards[0]).getByRole("button", { name: `猫 · ${en.dashboard.quickReview.tapToFlip}` });
  front.focus();
  fireEvent.click(front);
  expect(within(cards[0]).getByRole("button", { name: `猫 · ${en.dashboard.quickReview.tapToFlipBack}` })).toHaveFocus();
  expect(within(cards[0]).getByText("ねこ")).toBeVisible();
  expect(within(cards[0]).getByText("cat")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Start today's review" })).toBeNull();
  expect(screen.queryByRole("link", { name: en.study.backToHub })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("the recap carousel moves one card at a time and stops at each end", () => {
  show({ ...ready, total: 2, answered: 2, correct: 2, xp: 24, reviewedCards: reviewCards.slice(0, 2) });
  const previous = screen.getByRole("button", { name: en.dashboard.previous });
  const next = screen.getByRole("button", { name: en.dashboard.next });
  expect(previous).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(previous);
  expect(screen.getByText("Card 1 of 2")).toBeVisible();
  fireEvent.click(next);
  expect(screen.getByText("Card 2 of 2")).toBeVisible();
  expect(next).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(next);
  expect(screen.getByText("Card 2 of 2")).toBeVisible();
  fireEvent.click(previous);
  expect(screen.getByText("Card 1 of 2")).toBeVisible();
});

test("refreshes the recap when another tab completes the review before this tab starts", async () => {
  fetchMock.mockResolvedValueOnce(reply({ ...ready, answered: 1, correct: 1, xp: 12, cards: [] }));
  const view = show();
  fireEvent.click(screen.getByRole("button", { name: en.japaneseStudy.quickStart }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  view.rerender(dashboard({ ...ready, answered: 1, correct: 1, xp: 12, reviewedCards: reviewCards.slice(0, 1) }));
  expect(screen.getByRole("list", { name: en.japaneseStudy.dailyDeckLabel })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("resume restores saved daily score and exact uncertain-answer retries", async () => {
  const status = { ...ready, total: 2, answered: 1, correct: 1, xp: 12 };
  fetchMock.mockResolvedValueOnce(reply(daily(status))).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(studyResult()));
  show(status);
  fireEvent.click(screen.getByRole("button", { name: "Resume today's review" }));
  fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry saving answer" }));
  await screen.findByRole("button", { name: en.japaneseStudy.showDailyDeck });
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
