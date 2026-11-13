// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/en.json";
import jaMessages from "../../../../messages/ja.json";
import { JapanesePlacementResult } from "../result";
import { JapanesePlacementAssessment } from "../assessment";
import { JAPANESE_PLACEMENT_DOMAINS, type JapanesePlacementResult as ResultData } from "@/lib/japanese-placement/public";

vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
const fetchMock = vi.fn();
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const choice = { id: "kana-one", domain: "kana", prompt: { en: "Choose the reading.", ja: "読み方を選んでください。" }, stimulus: { kind: "text", text: "学校" }, response: { kind: "choice", choices: [{ id: "a", text: "がっこう" }, { id: "b", text: "がこう" }] } };
const assembly = { id: "writing-one", domain: "writing", prompt: { en: "Build a sentence.", ja: "文を作ってください。" }, stimulus: { kind: "text", text: "I read a book." }, response: { kind: "sentence_assembly", tiles: [{ id: "verb", text: "読みます。" }, { id: "topic", text: "私は" }, { id: "object", text: "本を" }] } };
const active = (question: typeof choice | typeof assembly = choice) => ({ canStartNewAttempt: false, retakeEligibleAt: null, retakeEligibleDate: null, attemptId: "attempt-one", status: "IN_PROGRESS", answered: 0, total: 24, expiresAt: "2026-10-22T01:20:00.000Z", timeLimitSec: 1200, serverNow: "2026-10-22T01:00:00.000Z", question, result: null });
const result: ResultData = { attemptId: "attempt-one", completedAt: "2026-10-22T01:20:00.000Z", completionReason: "time_limit", levelEstimate: { scope: "reading_writing", status: "insufficient_evidence", reason: "too_few_answers_or_domains" }, domains: JAPANESE_PLACEMENT_DOMAINS.map((domain) => ({ domain, planned: 4, answered: 0, correct: 0, incorrect: 0, notSure: 0, unanswered: 4, observation: "not_assessed" })) };
const completed = { ...active(), status: "COMPLETED", answered: 0, question: null, result, canStartNewAttempt: true };
const show = (locale = "en") => render(<NextIntlClientProvider locale={locale} timeZone="Asia/Tokyo" messages={locale === "ja" ? jaMessages : messages}><JapanesePlacementAssessment /></NextIntlClientProvider>);
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); window.sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test.each(["en", "ja"])("an awarded result shows the server's next retake date and offers no new start (%s)", async locale => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2099-01-01T00:00:00.000Z"));
  const copy = locale === "ja" ? jaMessages : messages;
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...completed, answered: 24,
    canStartNewAttempt: false, retakeEligibleAt: "2026-11-21T15:00:00.000Z", retakeEligibleDate: "2026-11-22",
    result: { ...result, levelEstimate: { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, basis: "jlpt_aligned_rules" } },
  } }));
  show(locale);
  expect(await screen.findByText("N3", { exact: true })).toBeVisible();
  expect(screen.queryByRole("button", { name: copy.japanesePlacement.newStart })).toBeNull();
  const summary = screen.getByRole("region", { name: copy.japanesePlacement.resultTitle });
  expect(within(summary).getByRole("status")).toHaveTextContent(copy.japanesePlacement.retakeFrom.replace("{date}", locale === "ja" ? "2026年11月22日" : "November 22, 2026"));
  expect(screen.queryByRole("link", { name: copy.japanesePlacement.book })).toBeNull();
  expect(screen.queryByRole("link", { name: copy.japanesePlacement.dashboard })).toBeNull();
});

test("shows a read-only flashcard hand and links to difficult-card practice", async () => {
  const domain = { ...result.domains[0], answered: 3, correct: 2, incorrect: 1, unanswered: 1, observation: "observed" as const };
  const award = { ...result, completionReason: "question_limit", domains: [domain, ...result.domains.slice(1)],
    levelEstimate: { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, basis: "jlpt_aligned_rules" },
  };
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...completed, answered: 3, canStartNewAttempt: false,
    retakeEligibleAt: "2026-11-21T15:00:00.000Z", retakeEligibleDate: "2026-11-22", result: award,
  } })).mockResolvedValueOnce(reply({ cards: [
    { id: "cat", feedback: { written: "猫", reading: "ねこ", meanings: ["cat"] } },
    { id: "dog", feedback: { written: "犬", reading: "いぬ", meanings: ["dog"] } },
    { id: "bird", feedback: { written: "鳥", reading: "とり", meanings: ["bird"] } },
  ], level: "N4", focus: "weak" }));
  show();
  const preview = await screen.findByRole("region", { name: "Flashcard review" });
  const link = await within(preview).findByRole("link", { name: messages.study.practice });
  expect(link).toHaveAttribute("href", "/learn/study/N4/practice?focus=weak");
  const cards = within(preview).getAllByRole("listitem");
  expect(cards).toHaveLength(3);
  fireEvent.click(within(cards[0]).getByRole("button", { name: `猫 · ${messages.dashboard.quickReview.tapToFlip}` }));
  expect(within(cards[0]).getByText("ねこ")).toBeVisible();
  const level = screen.getByRole("region", { name: messages.japanesePlacement.resultTitle });
  expect(within(level).getByText("2 correct / 3 answered")).toBeVisible();
  expect(within(level).getByText("Retake available from November 22, 2026.")).toBeVisible();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/japanese-placement/attempts", "/api/japanese-study/review-preview"]);
});

test.each(["en", "ja"] as const)("opens a separate score view and returns focus to the result action (%s)", async locale => {
  const copy = locale === "ja" ? jaMessages : messages;
  const t = copy.japanesePlacement;
  const domain = { domain: "kana" as const, planned: 5, answered: 3, correct: 2, incorrect: 1, notSure: 1, unanswered: 1, observation: "observed" as const };
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...completed, answered: 3, result: { ...result, completionReason: "question_limit",
    domains: result.domains.map(row => row.domain === "kana" ? domain : row),
    levelEstimate: { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, basis: "jlpt_aligned_rules" },
  } } })).mockResolvedValueOnce(reply({ cards: [], level: "N3", focus: "mixed" }));
  show(locale);
  expect(await screen.findByText("N3", { exact: true })).toBeVisible();
  const practice = await screen.findByRole("link", { name: copy.study.practice });
  expect(practice).toHaveAttribute("href", "/learn/study/N3/practice");
  expect(screen.queryByRole("heading", { name: t.breakdown })).toBeNull();
  expect(screen.queryByText(t.ruleBasis)).toBeNull();
  const viewLabel = t.viewScores;
  const backLabel = t.backToResult;
  fireEvent.click(screen.getByRole("button", { name: viewLabel }));
  await waitFor(() => expect(screen.getByRole("heading", { name: t.breakdown })).toHaveFocus());
  expect(screen.getByText(t.domains.kana)).toBeVisible();
  expect(within(screen.getByRole("region", { name: t.breakdown })).getByText(locale === "en" ? "2 correct / 3 answered" : "解答3問中 2問正解")).toBeVisible();
  expect(screen.getByText(locale === "en" ? "1 not sure · 1 unanswered" : "わからない：1問・未解答：1問")).toBeVisible();
  expect(screen.getByText(t.ruleBasis)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: backLabel }));
  expect(screen.getByRole("button", { name: viewLabel })).toHaveFocus();
  expect(screen.getByText("N3", { exact: true })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test.each(["en", "ja"])("explains the scope and starts only after explicit consent (%s)", async locale => {
  const copy = (locale === "ja" ? jaMessages : messages).japanesePlacement;
  fetchMock.mockResolvedValueOnce(reply({ attempt: null })).mockResolvedValueOnce(reply({ attempt: null })).mockResolvedValueOnce(reply(active()));
  show(locale);
  const instructions = await screen.findByRole("region", { name: copy.beforeYouStart });
  expect(within(instructions).getByText(copy.duration)).toBeVisible();
  expect(within(instructions).getByText(copy.startNotice)).toBeVisible();
  expect(screen.getByText(copy.scopeNotice)).toBeVisible();
  expect(screen.queryByRole("timer")).toBeNull();
  await act(async () => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][1]?.method).not.toBe("POST");
  expect(fetchMock.mock.calls[1][1]?.method).not.toBe("POST");
  fireEvent.click(within(instructions).getByRole("button", { name: copy.start }));
  expect(await screen.findByRole("timer")).toBeVisible();
  expect(fetchMock.mock.calls[2][1].method).toBe("POST");
});

test("an active eligible retake still resumes when its earlier award has a past retake date", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...active(), retakeEligibleAt: "2026-10-01T01:20:00.000Z" } }));
  show();
  expect(await screen.findByRole("button", { name: "がっこう" })).toBeEnabled();
  expect(screen.getByRole("timer")).toHaveTextContent("20:00");
});

test("server eligibility enables a retake even when the browser clock disagrees", async () => {
  vi.spyOn(Date, "now").mockReturnValue(0);
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...completed, canStartNewAttempt: true, retakeEligibleAt: "2026-11-22T01:20:00.000Z",
    result: { ...result, levelEstimate: { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, basis: "jlpt_aligned_rules" } },
  } }));
  show();
  expect(await screen.findByRole("button", { name: messages.japanesePlacement.newStart })).toBeEnabled();
});

test("a stale start refused by cooldown reloads the latest result instead of offering network retries", async () => {
  const latest = { ...completed, attemptId: "latest", canStartNewAttempt: false, retakeEligibleAt: "2026-11-21T15:00:00.000Z", retakeEligibleDate: "2026-11-22",
    result: { ...result, attemptId: "latest", levelEstimate: { status: "estimated", scope: "reading_writing", band: "N2", provisional: true, basis: "jlpt_aligned_rules" } },
  };
  fetchMock.mockResolvedValueOnce(reply({ attempt: null })).mockResolvedValueOnce(reply({ error: "PLACEMENT_COOLDOWN" }, 403)).mockResolvedValueOnce(reply({ attempt: latest }));
  show(); fireEvent.click(await screen.findByRole("button", { name: messages.japanesePlacement.start }));
  expect(await screen.findByText("N2", { exact: true })).toBeVisible();
  expect(fetchMock.mock.calls[2][0]).toBe("/api/japanese-placement/attempts");
  expect(screen.queryByText(messages.japanesePlacement.network)).toBeNull();
  expect(screen.queryByRole("button", { name: messages.japanesePlacement.newStart })).toBeNull();
});

test.each(["en", "ja"])("explains the versioned timeout adjustment to students and teachers (%s)", locale => {
  const adjusted = { ...result, levelEstimate: { status: "estimated" as const, scope: "reading_writing" as const,
    basis: "jlpt_aligned_rules" as const, provisional: true as const, band: "N2" as const },
    timeoutAdjustment: { unadjustedBand: "N1" as const, unanswered: 4, penaltyBandFraction: 1 / 6, bandReduction: 1 } };
  render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? jaMessages : messages}>
    <JapanesePlacementResult result={adjusted} teacher />
  </NextIntlClientProvider>);
  expect(screen.getByText(locale === "ja"
    ? "時間切れで4問が未回答でした。回答ペースを考慮し、開始レベルをN1からN2に調整しています。"
    : "Time ended with 4 unanswered questions. Timing adjusted the starting level from N1 to N2.")).toBeVisible();
});

test.each(["en", "ja"])("keeps source credits accessible without interrupting an active assessment (%s)", async (locale) => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() }));
  show(locale);
  await screen.findByRole("button", { name: "がっこう" });
  const credits = screen.getByRole("link", { name: locale === "ja" ? "出典・ライセンス" : "Sources and licences" });
  expect(credits).toHaveAttribute("href", "/japanese-placement/v3/NOTICE.txt");
  expect(credits).toHaveAttribute("target", "_blank");
});

test("loads saved progress without starting a new timer, and requires an explicit start", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: null })).mockResolvedValueOnce(reply(active()));
  show();
  expect(await screen.findByRole("button", { name: messages.japanesePlacement.start })).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: messages.japanesePlacement.start }));
  expect(await screen.findByRole("button", { name: "がっこう" })).toBeEnabled();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ requestId: expect.stringMatching(/^[a-f0-9-]{36}$/) });
  expect(screen.getByRole("timer")).toHaveTextContent("20:00");
});

test("resumes an existing question and never posts a new start on mount", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() }));
  show();
  await screen.findByRole("button", { name: "がっこう" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await waitFor(() => expect(screen.getByRole("heading", { name: "Choose the reading." })).toHaveFocus());
});

test("preserves the start UUID after an uncertain network failure", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: null })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(active()));
  show();
  fireEvent.click(await screen.findByRole("button", { name: messages.japanesePlacement.start }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  await screen.findByRole("button", { name: "がっこう" });
  expect(fetchMock.mock.calls[2][1].body).toBe(fetchMock.mock.calls[1][1].body);
});

test("builds, removes and clears sentence tiles; submits identities in the chosen order", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockResolvedValueOnce(reply({ ...completed, result }));
  show();
  const submit = await screen.findByRole("button", { name: "Submit sentence" });
  expect(submit).toBeDisabled();
  expect(screen.getByText("Your sentence", { exact: true })).toBeVisible();
  expect(screen.getByText("Word tiles", { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Add 私は, tile 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 本を, tile 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove 私は, position 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear sentence" }));
  for (const name of ["Add 私は, tile 2", "Add 本を, tile 3", "Add 読みます。, tile 1"]) fireEvent.click(screen.getByRole("button", { name }));
  expect(within(screen.getByRole("group", { name: "Your sentence" })).getAllByRole("button")).toHaveLength(3);
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  await screen.findByText("Not enough evidence to estimate a level");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"] });
  expect(screen.queryByRole("textbox")).toBeNull();
});

test("retries the exact uncertain response while freezing edits", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply({ ...active(assembly), answered: 1 }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "がっこう" }));
  const retry = await screen.findByRole("button", { name: "Retry saving answer" });
  expect(screen.getByRole("button", { name: "がこう" })).toBeDisabled();
  fireEvent.click(retry);
  await screen.findByRole("button", { name: "Submit sentence" });
  expect(fetchMock.mock.calls[2][1].body).toBe(fetchMock.mock.calls[1][1].body);
});

test("recovers a concurrent answer conflict by loading saved progress", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() })).mockResolvedValueOnce(reply({ error: "RESPONSE_CONFLICT" }, 409)).mockResolvedValueOnce(reply({ ...active(assembly), answered: 1 }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "がっこう" }));
  await screen.findByRole("button", { name: "Submit sentence" });
  expect(fetchMock.mock.calls[2][0]).toBe("/api/japanese-placement/attempts/attempt-one");
});

test("uses server time despite client clock skew and fetches the final result once at expiry", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.spyOn(performance, "now").mockReturnValue(0);
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...active(), serverNow: "2026-10-22T01:19:58.000Z" } })).mockResolvedValueOnce(reply(completed));
  await act(async () => { show(); });
  expect(screen.getByRole("timer")).toHaveTextContent("0:02");
  vi.mocked(performance.now).mockReturnValue(3_000);
  await act(async () => { vi.advanceTimersByTime(1_000); });
  expect(screen.getByText("Not enough evidence to estimate a level")).toBeVisible();
  await act(async () => { vi.advanceTimersByTime(5_000); });
  const placementCalls = fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/japanese-placement/attempts"));
  expect(placementCalls).toHaveLength(2);
  expect(placementCalls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
});

test.each([[503, "BANK_UNAVAILABLE", "The Japanese assessment is not available yet"], [409, "ATTEMPT_VERSION_UNSUPPORTED", "This assessment has been updated"]])("explains unavailable state %s without exposing implementation details", async (status, error, text) => {
  fetchMock.mockResolvedValueOnce(reply({ error }, status));
  show();
  expect(await screen.findByText(text)).toBeVisible();
  expect(screen.queryByText(error)).toBeNull();
});


test("finishes at expiry even after an uncertain answer failed to save", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.spyOn(performance, "now").mockReturnValue(0);
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...active(), serverNow: "2026-10-22T01:19:58.000Z" } })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(completed));
  await act(async () => { show(); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "がっこう" })); });
  expect(screen.getByRole("button", { name: "Retry saving answer" })).toBeEnabled();
  vi.mocked(performance.now).mockReturnValue(3_000);
  await act(async () => { vi.advanceTimersByTime(1_000); });
  expect(screen.getByText("Not enough evidence to estimate a level")).toBeVisible();
});


test("refreshes an active attempt after returning to the tab without clearing a sentence draft", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockResolvedValueOnce(reply({ ...active(assembly), serverNow: "2026-10-22T01:05:00.000Z" }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Add 私は, tile 2" }));
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  expect(within(screen.getByRole("group", { name: "Your sentence" })).getByRole("button", { name: "Remove 私は, position 1" })).toBeVisible();
  expect(screen.getByRole("timer")).toHaveTextContent("15:00");
});

test("restores the same attempt's sentence draft after a full remount and clears it only after a saved submission", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockResolvedValueOnce(reply(completed));
  const first = show();
  fireEvent.click(await screen.findByRole("button", { name: "Add 私は, tile 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 本を, tile 3" }));
  first.unmount(); show();
  expect(await screen.findByRole("button", { name: "Remove 私は, position 1" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Remove 本を, position 2" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Add 読みます。, tile 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit sentence" }));
  await screen.findByText(messages.japanesePlacement.insufficient);
  expect(window.sessionStorage.getItem("japanese-placement:sentence:attempt-one:writing-one")).toBeNull();
});

test("does not restore a sentence draft into another attempt", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockResolvedValueOnce(reply({ attempt: { ...active(assembly), attemptId: "another-attempt" } }));
  const first = show();
  fireEvent.click(await screen.findByRole("button", { name: "Add 私は, tile 2" }));
  first.unmount(); show();
  expect(await screen.findByRole("button", { name: "Add 私は, tile 2" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Remove 私は, position 1" })).toBeNull();
});

test("keeps a draft after an uncertain save and clears it when retry confirms the saved result", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(completed));
  show();
  for (const name of ["Add 私は, tile 2", "Add 本を, tile 3", "Add 読みます。, tile 1"]) fireEvent.click(await screen.findByRole("button", { name }));
  fireEvent.click(screen.getByRole("button", { name: "Submit sentence" }));
  const retry = await screen.findByRole("button", { name: "Retry saving answer" });
  expect(JSON.parse(window.sessionStorage.getItem("japanese-placement:sentence:attempt-one:writing-one")!).selected).toEqual(["topic", "object", "verb"]);
  fireEvent.click(retry);
  await screen.findByText(messages.japanesePlacement.insufficient);
  expect(window.sessionStorage.getItem("japanese-placement:sentence:attempt-one:writing-one")).toBeNull();
});

test.each([{ selected: ["unknown"] }, { selected: ["topic", "topic"] }, { selected: null }, { selected: "wrong shape" }])("discards an invalid stored sentence draft ($selected)", async ({ selected }) => {
  window.sessionStorage.setItem("japanese-placement:sentence:attempt-one:writing-one", JSON.stringify({ selected }));
  fetchMock.mockResolvedValueOnce(reply({ attempt: active(assembly) }));
  show();
  expect(await screen.findByRole("button", { name: "Add 私は, tile 2" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Submit sentence" })).toBeDisabled();
});

test("keeps timeout recovery manual after a failed completion fetch", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.spyOn(performance, "now").mockReturnValue(0);
  fetchMock.mockResolvedValueOnce(reply({ attempt: { ...active(), serverNow: "2026-10-22T01:19:59.000Z" } })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(completed));
  await act(async () => { show(); });
  vi.mocked(performance.now).mockReturnValue(2_000);
  await act(async () => { vi.advanceTimersByTime(1_000); });
  expect(screen.getByRole("button", { name: "がっこう" })).toBeDisabled();
  await act(async () => { vi.advanceTimersByTime(5_000); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
  expect(screen.getByText("Not enough evidence to estimate a level")).toBeVisible();
});

test("accounts for device sleep even when the monotonic clock pauses", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.spyOn(performance, "now").mockReturnValue(0);
  const wall = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() })).mockResolvedValueOnce(reply(completed));
  await act(async () => { show(); });
  wall.mockReturnValue(1_000_000 + 1_201_000);
  await act(async () => { vi.advanceTimersByTime(1_000); });
  expect(screen.getByText("Not enough evidence to estimate a level")).toBeVisible();
});


test("changes instructions with UI locale while keeping Japanese question content", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: active() }));
  show("ja");
  expect(await screen.findByRole("heading", { name: choice.prompt.ja })).toBeVisible();
  expect(screen.getByRole("button", { name: "がっこう" })).toBeVisible();
  expect(screen.getByRole("timer")).toHaveAccessibleName("残り時間");
});

test("uses the same level/breakdown presentation for a teacher without learner actions", () => {
  render(<NextIntlClientProvider locale="en" messages={messages}><JapanesePlacementResult teacher result={{ ...result,
    completionReason: "question_limit", levelEstimate: { status: "estimated", scope: "reading_writing", provisional: true, band: "N3", modelRange: { lower: "N4", upper: "N3" } } }} /></NextIntlClientProvider>);
  expect(screen.getByRole("region", { name: "Japanese starting level" })).toBeVisible();
  expect(screen.getByText("N3", { exact: true })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Skill breakdown" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Start a new assessment" })).toBeNull();
  expect(screen.getByText(/not an official JLPT/)).toBeVisible();
});

test.each(["en", "ja"])("explains a rule-based result without a model range in %s", (locale) => {
  const copy = locale === "ja" ? jaMessages : messages;
  render(<NextIntlClientProvider locale={locale} messages={copy}><JapanesePlacementResult result={{ ...result, completionReason: "question_limit",
    levelEstimate: { status: "estimated", scope: "reading_writing", provisional: true, band: "N3", basis: "jlpt_aligned_rules" } }} /></NextIntlClientProvider>);
  expect(screen.getByText("N3", { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: copy.japanesePlacement.viewScores }));
  expect(screen.getByText(locale === "en" ? "This estimate uses JLPT-aligned reading and sentence-building tasks." : "JLPTの各レベルを参考にした読解・文の組み立て問題から推定しています。")).toBeVisible();
  expect(screen.queryByText(/Estimated range:|推定範囲：/)).toBeNull();
});

test.each(["en", "ja"])("explains unconfirmed skill evidence accurately after a complete assessment in %s", (locale) => {
  render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? jaMessages : messages}><JapanesePlacementResult result={{ ...result, completionReason: "question_limit",
    levelEstimate: { status: "insufficient_evidence", scope: "reading_writing", reason: "unconfirmed_reading_or_construction" } }} /></NextIntlClientProvider>);
  expect(screen.getByText(locale === "en" ? "Your answers did not establish a consistent reading and sentence-building level." : "今回の解答では、読解と文の組み立てのレベルを十分に確認できませんでした。")).toBeVisible();
});
