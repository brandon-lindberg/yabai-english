// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
const active = (question: typeof choice | typeof assembly = choice) => ({ attemptId: "attempt-one", status: "IN_PROGRESS", answered: 0, total: 24, expiresAt: "2026-10-22T01:20:00.000Z", timeLimitSec: 1200, serverNow: "2026-10-22T01:00:00.000Z", question, result: null });
const result: ResultData = { attemptId: "attempt-one", completedAt: "2026-10-22T01:20:00.000Z", completionReason: "time_limit", levelEstimate: { scope: "reading_writing", status: "insufficient_evidence", reason: "too_few_answers_or_domains" }, domains: JAPANESE_PLACEMENT_DOMAINS.map((domain) => ({ domain, planned: 4, answered: 0, correct: 0, incorrect: 0, notSure: 0, unanswered: 4, observation: "not_assessed" })) };
const completed = { ...active(), status: "COMPLETED", answered: 0, question: null, result };
const show = (locale = "en") => render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? jaMessages : messages}><JapanesePlacementAssessment /></NextIntlClientProvider>);
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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
  expect(await screen.findByRole("button", { name: "Start assessment" })).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
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
  expect(screen.getByRole("heading", { name: "Choose the reading." })).toHaveFocus();
});

test("preserves the start UUID after an uncertain network failure", async () => {
  fetchMock.mockResolvedValueOnce(reply({ attempt: null })).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(active()));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Start assessment" }));
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
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
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
  expect(screen.getByText(locale === "en" ? "This estimate uses JLPT-aligned reading and sentence-building tasks." : "JLPTの各レベルを参考にした読解・文の組み立て問題から推定しています。")).toBeVisible();
  expect(screen.queryByText(/Estimated range:|推定範囲：/)).toBeNull();
});

test.each(["en", "ja"])("explains unconfirmed skill evidence accurately after a complete assessment in %s", (locale) => {
  render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? jaMessages : messages}><JapanesePlacementResult result={{ ...result, completionReason: "question_limit",
    levelEstimate: { status: "insufficient_evidence", scope: "reading_writing", reason: "unconfirmed_reading_or_construction" } }} /></NextIntlClientProvider>);
  expect(screen.getByText(locale === "en" ? "Your answers did not establish a consistent reading and sentence-building level. You can take a new assessment when you’re ready." : "今回の解答では、読解と文の組み立てのレベルを十分に確認できませんでした。準備ができたら、新しい診断を受けられます。")).toBeVisible();
});
