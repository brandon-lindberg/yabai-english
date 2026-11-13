// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { StudyPracticeSession } from "@/components/study/study-practice-session";
import { JapaneseStudySession } from "@/components/study/japanese-study-session";
import { StudyLevelList } from "@/components/study/study-level-list";
import { JapaneseStudyUnavailable } from "@/components/study/japanese-study-unavailable";
import { studyQuestion, kanjiQuestion, studyQueue, studyResult } from "../../test/japanese-study-ui-fixture";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";

vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
const fetchMock = vi.fn();
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const show = (locale = "en", focus: "mixed" | "weak" | "mastered" = "mixed") => render(
  <NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}>
    <JapaneseStudySession levelCode="N5" initialRpg={studyRpgProgressFromTotalXp(0)} queueFocus={focus} kind="mixed" />
  </NextIntlClientProvider>,
);
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test.each(["en", "ja"])("shows understandable usage labels and preserves the source note language (%s)", async locale => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue([{ ...studyQuestion, usage: ["adj-na", "uk", "after an author's name", "verbatim source note"] }])));
  show(locale);
  expect(await screen.findByText(locale === "ja" ? "ナ形容詞" : "Na-adjective")).toHaveAttribute("lang", locale);
  expect(screen.getByText(locale === "ja" ? "通常は仮名で表記" : "Usually written in kana")).toHaveAttribute("lang", locale);
  expect(screen.getByText(locale === "ja" ? "著者名の後に付く" : "after an author's name")).toHaveAttribute("lang", locale);
  expect(screen.getByText("verbatim source note")).toHaveAttribute("lang", "en");
  expect(screen.queryByText("adj-na", { exact: true })).toBeNull();
});

test.each(["en", "ja"])("loads Japanese tasks with reading context, keeps feedback until Next, and shows kanji categories separately (%s)", async locale => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue())).mockResolvedValueOnce(reply(studyResult())).mockResolvedValueOnce(reply(studyResult(kanjiQuestion)));
  show(locale);
  const answer = await screen.findByRole("button", { name: "cat" });
  expect(screen.getByText("ねこ")).toHaveAttribute("lang", "ja");
  await waitFor(() => expect(screen.getByRole("heading", { name: studyQuestion.instruction[locale as "en" | "ja"] })).toHaveFocus());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ levelCode: "N5", limit: 24, focus: "mixed", kind: "mixed" });
  fireEvent.click(answer);
  const next = await screen.findByRole("button", { name: locale === "ja" ? "次のカード" : "Next card" });
  expect(screen.getByText("猫")).toBeVisible();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ promptId: "prompt-one", choiceId: "choice-a", answerTimeMs: expect.any(Number) });
  fireEvent.click(next);
  expect(screen.getByRole("button", { name: "た.べる" })).toBeEnabled();
  expect(screen.queryByText("ショク · ジキ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "た.べる" }));
  await screen.findByText("ショク · ジキ");
  for (const label of locale === "ja" ? ["音読み", "訓読み", "名乗り"] : ["On-readings", "Kun-readings", "Name readings"]) expect(screen.getByText(label)).toBeVisible();
  expect(screen.getByText("た.べる · く.う")).toHaveAttribute("lang", "ja");
  fireEvent.click(screen.getByRole("button", { name: locale === "ja" ? "次のカード" : "Next card" }));
  expect(await screen.findByText(locale === "ja" ? ja.study.sessionDone : en.study.sessionDone)).toBeVisible();
  expect(screen.getByText(locale === "ja" ? "利用できるレベル：N5・N4" : "Available levels: N5, N4")).toBeVisible();
});

test("freezes an uncertain answer and retries the exact request without duplicate session credit", async () => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue([studyQuestion]))).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(studyResult()));
  show(); fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  const retry = await screen.findByRole("button", { name: "Retry saving answer" });
  expect(screen.getByRole("button", { name: "dog" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Next card" })).toBeNull();
  fireEvent.click(retry);
  fireEvent.click(await screen.findByRole("button", { name: "Next card" }));
  expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body);
  expect(screen.getByText("+12 XP this session")).toBeVisible();
});

test.each(["PROMPT_EXPIRED", "PROMPT_STALE", "REVIEW_CONFLICT"])("recovers %s with a fresh queue and no invented score", async error => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue())).mockResolvedValueOnce(reply({ error }, 409)).mockResolvedValueOnce(reply(studyQueue([kanjiQuestion])));
  show(); fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  fireEvent.click(await screen.findByRole("button", { name: "Load fresh questions" }));
  await screen.findByRole("button", { name: "た.べる" });
  expect(fetchMock.mock.calls[2][0]).toBe("/api/japanese-study/queue");
  expect(screen.getByText(/^\+0 XP this session/)).toBeVisible();
});

test("offers queue recovery, handles empty filtered sessions, and hides practice when publication is revoked", async () => {
  fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(studyQueue([])));
  show("en", "weak"); fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText(/No weak cards/)).toBeVisible();
  cleanup(); fetchMock.mockResolvedValueOnce(reply({ error: "STUDY_UNAVAILABLE" }, 503)); show();
  expect(await screen.findByText("Japanese flashcards are being prepared")).toBeVisible();
  expect(screen.getByRole("link", { name: "Take Japanese placement" })).toHaveAttribute("href", "/japanese-placement");
  expect(screen.queryByRole("button", { name: "cat" })).toBeNull();
});

test("rejects malformed or mismatched success responses rather than showing unearned feedback", async () => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue())).mockResolvedValueOnce(reply({ ...studyResult(), promptId: "another-question" }));
  show(); fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  expect(await screen.findByRole("button", { name: "Retry saving answer" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Next card" })).toBeNull();
});

test("prevents duplicate submissions while the first answer is in flight", async () => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue())).mockReturnValueOnce(new Promise(() => {}));
  show(); const answer = await screen.findByRole("button", { name: "cat" });
  fireEvent.click(answer); fireEvent.click(answer);
  await waitFor(() => expect(answer).toBeDisabled());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("renders shared level rows with Japanese mastery/access and no English exit test", () => {
  render(<NextIntlClientProvider locale="en" messages={en}><StudyLevelList language="JAPANESE" levels={[
    { id: "n5", code: "N5", title: "N5", locked: false, completed: true, masteryScore: 25, xp: 96, cardsTouched: 8, cardsTotal: 8, weakCount: 0, masteredCount: 8 },
    { id: "n4", code: "N4", title: "N4", locked: true, completed: false, masteryScore: 0, xp: 0, cardsTouched: 0, cardsTotal: 10, weakCount: 0, masteredCount: 0 },
  ]} /></NextIntlClientProvider>);
  expect(screen.getByRole("link", { name: "Practice" })).toHaveAttribute("href", "/learn/study/N5/practice");
  expect(screen.getByRole("link", { name: "Vocabulary" })).toHaveAttribute("href", "/learn/study/N5/practice?kind=vocabulary");
  expect(screen.queryByRole("link", { name: "Level test" })).toBeNull();
  expect(screen.queryByRole("link", { name: /N4/ })).toBeNull();
  expect(screen.getByText("Completed" , { exact: true })).toBeVisible();
});

test.each(["en", "ja"])("unpublished state offers lessons and placement without approvals or implementation details (%s)", locale => {
  render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}><JapaneseStudyUnavailable /></NextIntlClientProvider>);
  expect(screen.getByRole("link", { name: locale === "ja" ? "先生を探す" : "Find a teacher" })).toHaveAttribute("href", "/book");
  expect(screen.queryByText(/bank|policy|database|approval/i)).toBeNull();
});

test("English practice keeps its queue/review contract and automatic advance through the shared shell", async () => {
  fetchMock.mockResolvedValueOnce(reply({ cards: [{ id: "english-card", kind: "mcq", frontJa: "猫です。", options: ["It is a cat.", "It is a dog."] }] }))
    .mockResolvedValueOnce(reply({ correct: true, correctAnswer: "It is a cat.", xpGained: 12 }));
  render(<NextIntlClientProvider locale="en" messages={en}><StudyPracticeSession levelCode="BEGINNER_1" initialRpg={studyRpgProgressFromTotalXp(0)} /></NextIntlClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "It is a cat." }));
  expect(await screen.findByText(en.study.sessionDone, {}, { timeout: 2000 })).toBeVisible();
  expect(fetchMock.mock.calls[0][0]).toContain("/api/study/queue?trackSlug=english-flashcards");
  expect(fetchMock.mock.calls[1][0]).toBe("/api/study/review");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ cardId: "english-card", chosenAnswer: "It is a cat." });
});

test.each([401, 403, 503])("rechecks account/publication failures on review (%s)", async status => {
  fetchMock.mockResolvedValueOnce(reply(studyQueue())).mockResolvedValueOnce(reply({ error: "restricted" }, status));
  show(); fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "dog" })).toBeNull());
  expect(screen.queryByRole("button", { name: "Next card" })).toBeNull();
  expect(screen.getByRole("link", { name: status === 401 ? "Sign in" : status === 503 ? "Take Japanese placement" : "All levels" })).toBeVisible();
});

test("invalid queues are recoverable and another session clears its own score", async () => {
  fetchMock.mockResolvedValueOnce(reply({ ...studyQueue(), levelCode: "N3" })).mockResolvedValueOnce(reply(studyQueue([studyQuestion])))
    .mockResolvedValueOnce(reply(studyResult())).mockResolvedValueOnce(reply(studyQueue([kanjiQuestion])));
  show(); fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  fireEvent.click(await screen.findByRole("button", { name: "cat" }));
  fireEvent.click(await screen.findByRole("button", { name: "Next card" }));
  fireEvent.click(screen.getByRole("button", { name: "Start another session" }));
  await screen.findByRole("button", { name: "た.べる" });
  expect(screen.getByText(/^\+0 XP this session/)).toBeVisible();
});

test.each([400, 404, 409, 500])("initial queue HTTP %s offers retry instead of an empty session", async status => {
  fetchMock.mockResolvedValueOnce(reply({ error: "unavailable request" }, status));
  show();
  expect(await screen.findByRole("button", { name: "Retry" })).toBeVisible();
  expect(screen.queryByText(en.study.sessionEmpty)).toBeNull();
});
