// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { PlacementQuiz } from "../placement-quiz";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), updateSession: vi.fn(), refreshedUpdate: vi.fn(), refreshed: false }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: mocks.refreshed ? mocks.refreshedUpdate : mocks.updateSession }) }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    <a href={href} {...props}>{children}</a>,
}));

const question = {
  id: "test-question", instructionEn: "Pick one", instructionJa: "選んでください",
  questionEn: "Choose a response.", optionsEn: ["Yes", "No", "Maybe"],
};
const savedResult = { level: "INTERMEDIATE", subLevel: 2, earned: 30, max: 50,
  sectionScores: Object.fromEntries(["grammar", "vocabulary", "reading", "functional"].map(s => [s, { earned: 1, max: 2, ratio: 0.5 }])),
  strengths: [], improvements: [], needsManualReview: false, manualReviewReasons: [] };
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const requests = (action: string) => mocks.fetch.mock.calls.filter(([, init]) =>
  init?.body && JSON.parse(init.body).action === action,
);
let firstDeadline: number;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T00:00:00Z"));
  vi.clearAllMocks();
  mocks.refreshed = false;
  vi.stubGlobal("fetch", mocks.fetch);
  firstDeadline = Date.now() + 900;
  let starts = 0;
  mocks.fetch.mockImplementation(async (_url, init) => {
    if (!init?.body || JSON.parse(init.body).action === "start") {
      starts++;
      return response({ question, attemptToken: `token-${starts}`, expiresAt: starts === 1 ? firstDeadline : Date.now() + 1200000, progress: { current: 1, total: 24 } });
    }
    return response({ status: "inconclusive", reason: "insufficient_evidence", answered: 0, required: 15 });
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(locale: "en" | "ja" = "en") {
  await act(async () => {
    render(<NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}>
      <PlacementQuiz />
    </NextIntlClientProvider>);
  });
}

test("a cooldown displays the server's calendar date without a time", async () => {
  mocks.fetch.mockResolvedValueOnce(response({ error: "cooldown", eligibleAt: "2026-11-29T15:00:00.000Z", eligibleDate: "2026-11-30" }, 403));
  await mount();
  expect(screen.getByText(en.placement.cooldownBody.replace("{date}", "November 30, 2026"))).toBeVisible();
});

test("the last fraction of a second stays answerable and timeout starts only at the deadline", async () => {
  await mount();
  expect(requests("finish")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(requests("finish")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument();
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test.each(["en", "ja"] as const)("an inconclusive timeout gives a localized recovery in %s and permits a fresh attempt", async (locale) => {
  await mount(locale);
  await act(() => vi.advanceTimersByTimeAsync(1000));
  const restartLabel = locale === "ja" ? "もう一度受ける" : "Start again";
  expect(screen.getByText(locale === "ja" ? "レベルを判定できませんでした" : "Your level couldn’t be determined")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: locale === "ja" ? "ダッシュボードへ" : "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: restartLabel })));
  expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
  expect(requests("start")).toHaveLength(1);
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test("a server-rejected late answer finalizes only the previous token and shows the inconclusive outcome", async () => {
  firstDeadline = Date.now() + 10000;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (init?.body && JSON.parse(init.body).action === "answer") return response({ error: "attempt_expired", expiresAt: firstDeadline }, 409);
    return original(url, init);
  });
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  expect(requests("finish")).toHaveLength(1);
  expect(JSON.parse(requests("finish")[0]![1].body)).toMatchObject({ attemptToken: "token-1" });
  expect(screen.getByText("Your level couldn’t be determined")).toBeInTheDocument();
  expect(screen.queryByText("attempt_expired")).not.toBeInTheDocument();
});

test("a failed timeout submission has a retry without reopening answers or looping requests", async () => {
  let finishes = 0;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (init?.body && JSON.parse(init.body).action === "finish" && ++finishes === 1) throw new Error("offline");
    return original(url, init);
  });
  await mount();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t confirm the result. Try saving again.");
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(requests("finish")).toHaveLength(1);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try saving again" })));
  expect(requests("finish")).toHaveLength(2);
  expect(screen.getByText("Your level couldn’t be determined")).toBeInTheDocument();
});

test("an incomplete response from the server resynchronizes an early client clock and keeps answers available", async () => {
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (init?.body) return response({ error: "attempt_incomplete", expiresAt: firstDeadline, serverNow: firstDeadline - 5000 }, 409);
    return original(url, init);
  });
  await mount();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
  expect(screen.queryByText("attempt_incomplete")).not.toBeInTheDocument();
  expect(requests("finish")).toHaveLength(1);
});

test.each([
  [{ status: "inconclusive", reason: "question_pool_exhausted", required: 24 }, 200, en.placement.poolExhaustedBody],
  [{ error: "attempt_unavailable" }, 409, en.placement.attemptUnavailableBody],
] as const)("an unavailable attempt offers recovery (%j)", async (body, status, description) => {
  firstDeadline = Date.now() + 10000;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (!init?.body) return original(url, init);
    if (JSON.parse(init.body).action === "answer") return response({ question: null, objectiveComplete: true, attemptToken: "complete-token" });
    return response(body, status);
  });
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: en.placement.submitPlacement })));
  expect(screen.getByText("Your level couldn’t be determined")).toBeInTheDocument();
  expect(screen.getByText(description)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start again" })).toBeEnabled();
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test("a failed restart does not reopen the expired question and can be retried", async () => {
  let starts = 0;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if ((!init?.body || JSON.parse(init.body).action === "start") && ++starts === 2) throw new Error("offline");
    return original(url, init);
  });
  await mount();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Start again" })));
  expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument();
  expect(screen.getByText(en.placement.loadError)).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Start again" })));
  expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
});

test("timeout waits for an in-flight answer and finalizes its accepted token", async () => {
  let resolveAnswer: (value: unknown) => void;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation((url, init) => {
    if (init?.body && JSON.parse(init.body).action === "answer") return new Promise((resolve) => { resolveAnswer = resolve; });
    return original(url, init);
  });
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(requests("finish")).toHaveLength(0);
  await act(async () => resolveAnswer(response({ question, attemptToken: "accepted-token", expiresAt: firstDeadline })));
  expect(requests("finish")).toHaveLength(1);
  expect(JSON.parse(requests("finish")[0]![1].body).attemptToken).toBe("accepted-token");
});

test("a completed result still renders and refreshes the session", async () => {
  firstDeadline = Date.now() + 10000;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (!init?.body) return original(url, init);
    if (JSON.parse(init.body).action === "answer") return response({ question: null, objectiveComplete: true, attemptToken: "complete-token" });
    return response({ level: "INTERMEDIATE", subLevel: 2, earned: 30, max: 50, sectionScores: Object.fromEntries(["grammar", "vocabulary", "reading", "functional"].map((s) => [s, { earned: 1, max: 2, ratio: 0.5 }])), strengths: [], improvements: [], needsManualReview: false, manualReviewReasons: [] });
  });
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: en.placement.submitPlacement })));
  expect(screen.getByText("Intermediate")).toBeInTheDocument();
  expect(mocks.updateSession).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test.each(["en", "ja"] as const)("a qualifying timed result explains the completion penalty in %s", async (locale) => {
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (!init?.body) return original(url, init);
    return response({ level: "ADVANCED", subLevel: 2, earned: 75, max: 75,
      sectionScores: Object.fromEntries(["grammar", "vocabulary", "reading", "functional"].map((s) => [s, { earned: 1, max: 1, ratio: 1 }])),
      strengths: [], improvements: [], needsManualReview: false, manualReviewReasons: [],
      assessment: { policyVersion: 2, completionReason: "timeout", answered: 15, total: 24, minimumAnswers: 15, timeoutPenaltyPoints: 10 },
    });
  });
  await mount(locale);
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByText(locale === "ja"
    ? "全24問中15問に回答した時点で制限時間になりました。未回答の問題による減点を判定に反映しています。"
    : "Time ended after 15 of 24 questions. This placement accounts for a penalty for unanswered questions.")).toBeInTheDocument();
  expect(mocks.updateSession).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Start again" })).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});

test("the minimum and timeout penalty are explained before answering and on insufficient evidence", async () => {
  firstDeadline = Date.now() + 10000;
  await mount();
  expect(screen.getByText("A timed result requires at least 15 answers covering every skill area. Unanswered questions carry a penalty.")).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(10000));
  expect(screen.getByText(/at least 15 answered questions/)).toBeInTheDocument();
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test("a version or bank mismatch during an answer offers restart immediately", async () => {
  firstDeadline = Date.now() + 10000;
  const original = mocks.fetch.getMockImplementation()!;
  mocks.fetch.mockImplementation(async (url, init) => init?.body ? response({ error: "attempt_unavailable" }, 409) : original(url, init));
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  expect(screen.getByRole("button", { name: "Start again" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument();
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test("a resumed attempt restores its progress and corrects a fast client clock", async () => {
  mocks.fetch.mockResolvedValue(response({ question, attemptToken: "saved-token", expiresAt: Date.now() + 480_000,
    serverNow: Date.now() - 120_000, progress: { current: 8, total: 24 } }));
  await mount();
  expect(screen.getByText(/10:00/)).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
});

test("reload after the last accepted answer restores the finish action", async () => {
  mocks.fetch.mockResolvedValue(response({ question: null, objectiveComplete: true, attemptToken: "saved-token", expiresAt: Date.now() + 60_000, progress: { current: 24, total: 24 } }));
  await mount();
  expect(screen.getByRole("button", { name: en.placement.submitPlacement })).toBeEnabled();
  expect(screen.queryByText(en.placement.loadError)).not.toBeInTheDocument();
});

test.each(["en", "ja"] as const)("an expired read renders its saved result in %s", async locale => {
  mocks.fetch.mockResolvedValue(response(savedResult));
  await mount(locale);
  expect(screen.getByText(locale === "ja" ? ja.placement.level.INTERMEDIATE : en.placement.level.INTERMEDIATE)).toBeInTheDocument();
  expect(mocks.updateSession).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test("an insufficient expired read offers the existing retry state", async () => {
  mocks.fetch.mockResolvedValue(response({ status: "inconclusive", reason: "insufficient_evidence", answered: 14, required: 15 }));
  await mount();
  expect(screen.getByText(en.placement.inconclusiveTitle)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: en.placement.startAgain })).toBeEnabled();
});

test.each(["en", "ja"] as const)("an uncertain answer freezes other choices and retries the exact submission in %s", async locale => {
  firstDeadline = Date.now() + 60_000;
  const original = mocks.fetch.getMockImplementation()!;
  let answers = 0;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (init?.body && JSON.parse(init.body).action === "answer") {
      if (++answers === 1) throw new Error("response lost");
      return response({ question: { ...question, id: "next-question", questionEn: "Next question." }, attemptToken: "saved-token", progress: { current: 2, total: 24 } });
    }
    return original(url, init);
  });
  await mount(locale);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  expect(screen.getByRole("button", { name: "No" })).toBeDisabled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: locale === "ja" ? "同じ回答の保存を再試行" : "Retry saving this answer" })));
  expect(requests("answer")).toHaveLength(2);
  expect(requests("answer")[0][1].body).toBe(requests("answer")[1][1].body);
  expect(screen.getByText("Next question.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
});

test("a conflicting answer reloads authoritative progress and does not submit it to the next question", async () => {
  firstDeadline = Date.now() + 60_000;
  const original = mocks.fetch.getMockImplementation()!;
  let reads = 0;
  mocks.fetch.mockImplementation(async (url, init) => {
    if (init?.body) return response({ error: "attempt_conflict" }, 409);
    if (++reads > 1) return response({ question: { ...question, id: "other-tab-question", questionEn: "Saved in another tab." }, attemptToken: "other-tab-token", expiresAt: firstDeadline, progress: { current: 5, total: 24 } });
    return original(url, init);
  });
  await mount();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Yes" })));
  expect(screen.getByText("Saved in another tab.")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Your saved progress changed in another tab. Continue from this question.");
  expect(requests("answer")).toHaveLength(1);
});

test("returning to the tab refreshes the saved attempt without polling", async () => {
  firstDeadline = Date.now() + 60_000;
  await mount();
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(mocks.fetch.mock.calls.filter(([, init]) => !init?.body)).toHaveLength(2);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.fetch.mock.calls.filter(([, init]) => !init?.body)).toHaveLength(2);
});

test.each(["finish", "expired read"])("a session refresh cannot replace the %s result with the cooldown screen", async source => {
  firstDeadline = Date.now() + 60_000;
  let reads = 0;
  mocks.updateSession.mockImplementationOnce(async () => { mocks.refreshed = true; });
  mocks.fetch.mockImplementation(async (_url, init) => {
    if (!init?.body) {
      if (++reads > 1) return response({ error: "cooldown", eligibleDate: "2026-11-30" }, 403);
      return response(source === "expired read" ? savedResult : { question: null, objectiveComplete: true, attemptToken: "saved-token", expiresAt: firstDeadline });
    }
    return response(savedResult);
  });
  await mount();
  if (source === "finish") await act(async () => fireEvent.click(screen.getByRole("button", { name: en.placement.submitPlacement })));
  expect(screen.getByText(en.placement.level.INTERMEDIATE)).toBeInTheDocument();
  expect(reads).toBe(1);
  expect(mocks.updateSession).toHaveBeenCalledTimes(1);
  expect(mocks.refreshedUpdate).not.toHaveBeenCalled();
});
