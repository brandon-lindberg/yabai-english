import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { loadPlacementBankSync } from "../../src/lib/placement-bank/load-placement-bank";
import type { PlacementQuestionPublic, scorePlacementAnswers } from "../../src/lib/placement-test";
import type { JapanesePlacementBank } from "../../src/lib/japanese-placement/bank";
import type { JapaneseAttemptView } from "../../src/lib/japanese-placement/public";
import type { JapaneseStudyQueue } from "../../src/lib/study/japanese-public";
import { fixtureCommand, readMirrorFixtures, releaseStudent, signInMirrorUser } from "./helpers/mirror-fixtures";
import { chooseEnglishAnswer, chooseJapaneseAnswer } from "./helpers/placement-answers";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease } from "./helpers/release-verification";
import { stripHtmlTags } from "../../src/lib/placement-question-display";

const englishBank = loadPlacementBankSync();
const initialCorrect = [true, false, false, true, true, true, true];
type EnglishView = { question: PlacementQuestionPublic | null; attemptToken: string; expiresAt: number; progress: { current: number; total: number } };
type EnglishResult = ReturnType<typeof scorePlacementAnswers>;
const placementReply = (page: Page, action: string) => page.waitForResponse(response => response.url().endsWith("/api/placement") && response.request().method() === "POST" && response.request().postDataJSON().action === action);
const profile = (id: string) => fixtureCommand("release-learning-state").profiles.find((row: { userId: string }) => row.userId === id);

async function openEnglish(page: Page, name: string, locale: "en" | "ja" = "en") {
  await signInMirrorUser(page, releaseStudent(name).email, "ENGLISH");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  if (locale === "ja") await chooseInterfaceLocale(page, en.common, "ja");
  const initial = page.waitForResponse(response => response.url().includes("/api/placement?") && response.request().method() === "GET");
  await page.goto(locale === "ja" ? "/placement" : "/en/placement");
  const response = await initial;
  expect(response.status()).toBe(200);
  return await response.json() as EnglishView;
}

async function answerEnglish(page: Page, current: EnglishView, correct = true) {
  expect(current.question).toBeTruthy();
  const item = englishBank.find(item => item.id === current.question!.id)!;
  expect(JSON.stringify(current.question)).not.toMatch(/correctIndex|stemId/);
  const next = placementReply(page, "answer");
  await chooseEnglishAnswer(page, item.correctIndex, correct);
  const response = await next;
  expect(response.status()).toBe(200);
  const view = await response.json() as EnglishView;
  expect(view.expiresAt).toBe(current.expiresAt);
  return view;
}

test("English placement follows the requested staircase, saves its award and enforces cooldown", async ({ page }) => {
  const fixture = readMirrorFixtures();
  const japaneseBefore = profile(fixture.users[0].id);
  const attemptsBefore = fixtureCommand("release-learning-state").attempts;
  let current = await openEnglish(page, "placement-english");
  const path: string[] = [];
  const ids = new Set<string>();
  for (let index = 0; current.question; index++) {
    expect(ids.has(current.question.id)).toBe(false); ids.add(current.question.id);
    if (index < 8) path.push(current.question.cefrBand);
    if (index === 0) await captureRelease(page, "ENGLISH-placement-opening");
    current = await answerEnglish(page, current, initialCorrect[index] ?? true);
    if (index === 4) {
      const read = page.waitForResponse(response => response.url().includes("/api/placement?") && response.request().method() === "GET");
      await page.reload();
      const restored = await (await read).json() as EnglishView;
      expect(restored).toMatchObject({ ...current, serverNow: expect.any(Number) });
      current = restored;
      await captureRelease(page, "ENGLISH-placement-resumed");
    }
  }
  expect(path).toEqual(["A1", "A2", "A2", "A1", "A2", "A2", "A2", "B1"]);
  expect(ids.size).toBe(24);
  const finished = placementReply(page, "finish");
  await page.getByRole("button", { name: en.placement.submitPlacement, exact: true }).click();
  const result = await (await finished).json() as EnglishResult;
  expect(result).toMatchObject({ level: "ADVANCED", subLevel: 3, needsManualReview: false });
  expect(result.assessment).toMatchObject({ policyVersion: 2, answered: 24, completionReason: "completed", timeoutPenaltyPoints: 0 });
  await expect(page.getByText(en.placement.resultTitle, { exact: true })).toBeVisible();
  await captureRelease(page, "ENGLISH-placement-result");
  const savedProfile = profile(releaseStudent("placement-english").id);
  expect(savedProfile).toMatchObject({ placedLevel: result.level, placedSubLevel: result.subLevel, placementReport: { assessment: result.assessment } });
  const receipt = await page.request.post("/api/placement", { data: { action: "finish", attemptToken: current.attemptToken } });
  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual(result);
  expect(profile(releaseStudent("placement-english").id)).toEqual(savedProfile);
  expect(profile(fixture.users[0].id)).toEqual(japaneseBefore);
  expect(fixtureCommand("release-learning-state").attempts).toEqual(attemptsBefore);
  await page.reload();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  const cooldown = await page.request.get("/api/placement");
  expect(cooldown.status()).toBe(403);
  expect(await cooldown.json()).toMatchObject({ error: "cooldown", eligibleAt: expect.any(String) });
  expect((await page.request.get("/api/japanese-placement/attempts")).status()).toBe(403);
});

test("Japanese placement follows N5-first confirmation, resumes sentence tiles and persists an independent automatic result", async ({ page }) => {
  const fixture = readMirrorFixtures();
  const englishBefore = profile(fixture.users[0].id);
  const bank = fixtureCommand("release-placement-bank") as JapanesePlacementBank;
  await page.setViewportSize({ width: 390, height: 950 });
  await signInMirrorUser(page, fixture.users[0].email, "JAPANESE");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await setHeaderTheme(page, en.common, "dark");
  await page.goto("/en/japanese-placement");
  const started = page.waitForResponse(response => response.url().endsWith("/api/japanese-placement/attempts") && response.request().method() === "POST");
  await page.getByRole("button", { name: en.japanesePlacement.start, exact: true }).click();
  let current = await (await started).json() as JapaneseAttemptView;
  const deadline = current.expiresAt;
  const path: string[] = [], ids = new Set<string>(), passages = new Set<string>();
  let resumed = false;
  for (let index = 0; current.question; index++) {
    const item = bank.items.find(item => item.id === current.question!.id)!;
    expect(ids.has(item.id)).toBe(false); ids.add(item.id);
    if (item.passageId) { expect(passages.has(item.passageId)).toBe(false); passages.add(item.passageId); }
    if (index < 8) path.push(item.referenceBand!);
    expect(JSON.stringify(current)).not.toMatch(/correctChoiceId|acceptedOrders|referenceBand|passageId|calibration/);
    if (index === 0) await captureRelease(page, "JAPANESE-placement-opening");
    const next = page.waitForResponse(response => response.url().endsWith(`/api/japanese-placement/attempts/${current.attemptId}/responses`) && response.request().method() === "POST");
    await chooseJapaneseAnswer(page, current.question, item, initialCorrect[index] ?? true, async position => {
      if (resumed || position !== 1) return;
      await page.reload();
      await expect(page.getByRole("group", { name: en.japanesePlacement.sentence, exact: true }).getByRole("button")).toHaveCount(2);
      const stored = await (await page.request.get(`/api/japanese-placement/attempts/${current.attemptId}`)).json();
      expect(stored).toMatchObject({ attemptId: current.attemptId, expiresAt: deadline, answered: index, question: { id: item.id } });
      await captureRelease(page, "JAPANESE-placement-tiles");
      resumed = true;
    });
    const response = await next; expect(response.status()).toBe(200);
    current = await response.json(); expect(current.expiresAt).toBe(deadline);
  }
  expect(path).toEqual(["N5", "N4", "N4", "N5", "N4", "N4", "N4", "N3"]);
  expect(resumed).toBe(true); expect(ids.size).toBe(24);
  expect(current).toMatchObject({ status: "COMPLETED", answered: 24, result: { completionReason: "question_limit", levelEstimate: { status: "estimated", band: "N1", basis: "jlpt_aligned_rules" } } });
  expect(current).toMatchObject({ canStartNewAttempt: false, retakeEligibleAt: expect.any(String) });
  const refused = await page.request.post("/api/japanese-placement/attempts", { data: { requestId: crypto.randomUUID() } });
  expect(refused.status()).toBe(403);
  expect(await refused.json()).toEqual({ error: "PLACEMENT_COOLDOWN" });
  await expect(page.getByText(en.japanesePlacement.ruleBasis, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.japanesePlacement.newStart, exact: true })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "You already completed a placement test" })).toBeVisible();
  await captureRelease(page, "JAPANESE-placement-result");
  await page.reload();
  await expect(page.getByRole("button", { name: en.japanesePlacement.newStart, exact: true })).toHaveCount(0);
  expect((await (await page.request.get(`/api/japanese-placement/attempts/${current.attemptId}`)).json()).result).toEqual(current.result);
  await page.setViewportSize({ width: 1440, height: 950 });
  await setHeaderTheme(page, en.common, "light");
  await captureRelease(page, "JAPANESE-placement-cooldown-desktop");
  fixtureCommand("release-japanese-empty-history", { learnerId: fixture.users[0].id });
  await page.reload();
  await expect(page.getByRole("region", { name: en.japanesePlacement.resultTitle, exact: true })).toContainText("N1");
  await page.goto("/en/dashboard");
  await expect(page.getByText(en.japanesePlacement.savedLevel, { exact: false })).toContainText("N1");
  await expect(page.getByRole("link", { name: en.japanesePlacement.savedResult, exact: true })).toBeVisible();
  const primary = page.getByRole("navigation", { name: en.common.primaryNavAria }).filter({ visible: true });
  await expect(primary.getByRole("link", { name: en.common.learn, exact: true })).toBeVisible();
  await captureRelease(page, "JAPANESE-saved-level-desktop");
  await chooseInterfaceLocale(page, en.common, "ja");
  await page.setViewportSize({ width: 390, height: 950 });
  await setHeaderTheme(page, ja.common, "dark");
  await expect(page.getByText(ja.japanesePlacement.savedLevel, { exact: false })).toContainText("N1");
  const mobile = page.getByRole("navigation", { name: ja.common.primaryNavAria }).filter({ visible: true });
  await expect(mobile.getByRole("link", { name: ja.common.learn, exact: true })).toBeVisible();
  await captureRelease(page, "JAPANESE-saved-level-mobile");
  await mobile.getByRole("link", { name: ja.common.learn, exact: true }).click();
  await expect(page.getByRole("heading", { name: ja.japaneseStudy.title, exact: true })).toBeVisible();
  await expect(page.locator("[data-study-beta]")).toBeVisible();
  expect(profile(fixture.users[0].id)).toEqual(englishBefore);
  expect((await page.request.get("/api/placement")).status()).toBe(403);
});

for (const answered of [14, 15]) test(`English ${answered}-answer timeout ${answered === 15 ? "awards a penalized level" : "allows a retry without cooldown"}`, async ({ page }) => {
  const name = answered === 15 ? "timeout-english" : "insufficient-english";
  const copy = answered === 14 ? ja : en;
  if (answered === 14) await page.setViewportSize({ width: 390, height: 950 });
  let current = await openEnglish(page, name, answered === 14 ? "ja" : "en");
  if (answered === 14) await captureRelease(page, "ENGLISH-placement-opening-ja");
  for (let index = 0; index < answered; index++) current = await answerEnglish(page, current);
  const before = profile(releaseStudent(name).id);
  // Clone only this disposable fixture's accepted history at a near deadline.
  // Reload/recovery and expiry now use real persisted state; no API response is fabricated.
  fixtureCommand("release-english-deadline", { learnerId: releaseStudent(name).id, attemptToken: current.attemptToken });
  const finish = page.waitForResponse(async response => {
    if (!response.url().includes("/api/placement") || response.status() !== 200) return false;
    const body = await response.json();
    return Boolean(body.level || body.status === "inconclusive");
  });
  await page.reload();
  const response = await finish; expect(response.status()).toBe(200);
  const result = await response.json();
  if (answered === 15) {
    expect(result.assessment).toMatchObject({ answered: 15, minimumAnswers: 15, completionReason: "timeout", timeoutPenaltyPoints: 10 });
    expect(result.assessment.adjustedScore).toBeLessThan(result.assessment.unadjustedScore);
    await expect(page.getByText(en.placement.resultTitle, { exact: true })).toBeVisible();
    expect(profile(releaseStudent(name).id)).toMatchObject({ placedLevel: result.level, placedSubLevel: result.subLevel, placementReport: { assessment: result.assessment } });
    expect((await page.request.get("/api/placement")).status()).toBe(403);
  } else {
    expect(result).toMatchObject({ status: "inconclusive", answered: 14, required: 15, reason: "insufficient_evidence" });
    await expect(page.getByRole("button", { name: copy.placement.startAgain, exact: true })).toBeVisible();
    expect(profile(releaseStudent(name).id)).toEqual(before);
    expect((await page.request.get("/api/placement")).status()).toBe(200);
  }
  await captureRelease(page, `ENGLISH-placement-timeout-${answered}`);
  if (answered === 14) {
    const retry = page.waitForResponse(response => response.url().includes("/api/placement?") && response.request().method() === "GET");
    await page.getByRole("button", { name: copy.placement.startAgain, exact: true }).click();
    const response = await retry; expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ question: { cefrBand: "A1" }, progress: { current: 1, total: 24 } });
  }
});

test("English answer retries, reload and stale-view recovery preserve accepted progress", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 950 });
  let current = await openEnglish(page, "resume-english");
  await setHeaderTheme(page, en.common, "dark");
  const item = englishBank.find(q => q.id === current.question!.id)!;
  let accepted: EnglishView | undefined;
  await page.route("**/api/placement", async route => {
    if (route.request().method() !== "POST" || route.request().postDataJSON().action !== "answer") return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200); accepted = await response.json();
    await route.abort("failed");
  }, { times: 1 });
  await chooseEnglishAnswer(page, item.correctIndex, true);
  await expect(page.getByRole("button", { name: "Retry saving this answer", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: item.optionsEn[1], exact: true })).toBeDisabled();
  await captureRelease(page, "ENGLISH-placement-answer-recovery");
  const retried = placementReply(page, "answer");
  await page.getByRole("button", { name: "Retry saving this answer", exact: true }).focus();
  await page.keyboard.press("Enter");
  current = await (await retried).json();
  expect(current).toMatchObject({ ...accepted!, serverNow: expect.any(Number) });
  expect(current.progress.current).toBe(2);
  const read = page.waitForResponse(response => response.url().includes("/api/placement?") && response.request().method() === "GET");
  await page.reload();
  expect(await (await read).json()).toMatchObject({ ...current, serverNow: expect.any(Number) });

  // A second client advances the same attempt while this view is still showing question two.
  const second = englishBank.find(q => q.id === current.question!.id)!;
  const advanced = await page.request.post("/api/placement", { data: { action: "answer", attemptToken: current.attemptToken, answer: second.correctIndex } });
  expect(advanced.status()).toBe(200);
  const saved = await advanced.json() as EnglishView;
  const conflicting = placementReply(page, "answer");
  await chooseEnglishAnswer(page, second.correctIndex, false);
  expect((await conflicting).status()).toBe(409);
  await expect(page.getByRole("alert").filter({ hasText: en.placement.answerConflict })).toContainText(en.placement.answerConflict);
  await expect(page.getByText(stripHtmlTags(saved.question!.questionEn), { exact: true })).toBeVisible();
  await captureRelease(page, "ENGLISH-placement-conflict-recovery");
});

for (const answered of [11, 18]) test(`Japanese ${answered}-answer timeout ${answered === 18 ? "awards its independently penalized level" : "preserves insufficient evidence"}`, async ({ page }) => {
  const name = answered === 18 ? "timeout-japanese" : "insufficient-japanese";
  const learner = releaseStudent(name);
  await signInMirrorUser(page, learner.email, "JAPANESE");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  const copy = answered === 18 ? ja : en;
  if (answered === 18) {
    await page.setViewportSize({ width: 390, height: 950 });
    await chooseInterfaceLocale(page, en.common, "ja");
    await setHeaderTheme(page, ja.common, "dark");
  }
  const englishBefore = profile(learner.id);
  const staged = fixtureCommand("release-japanese-deadline", { learnerId: learner.id, answered });
  const expired = page.waitForResponse(async response => response.url().endsWith(`/api/japanese-placement/attempts/${staged.attemptId}`) && response.status() === 200 && (await response.json()).status === "COMPLETED");
  await page.goto(answered === 18 ? "/japanese-placement" : "/en/japanese-placement");
  await expired;
  const result = await (await page.request.get(`/api/japanese-placement/attempts/${staged.attemptId}`)).json() as JapaneseAttemptView;
  expect(result).toMatchObject({ answered, expiresAt: staged.expiresAt, result: { completionReason: "time_limit", levelEstimate: { status: answered === 18 ? "estimated" : "insufficient_evidence" } } });
  if (answered === 18) {
    expect(result.result).toMatchObject({ levelEstimate: { band: "N2" }, timeoutAdjustment: { unadjustedBand: "N1", unanswered: 6 } });
    expect(result.result!.timeoutAdjustment!.penaltyBandFraction).toBeGreaterThan(0);
    expect(result.result!.timeoutAdjustment!.bandReduction).toBe(1);
    await expect(page.getByText(copy.japanesePlacement.ruleBasis, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.japanesePlacement.newStart, exact: true })).toHaveCount(0);
    expect(result.canStartNewAttempt).toBe(false);
    const denied = await page.request.post("/api/japanese-placement/attempts", { data: { requestId: crypto.randomUUID() } });
    expect(denied.status()).toBe(403);
    expect(await denied.json()).toEqual({ error: "PLACEMENT_COOLDOWN" });
  } else await expect(page.getByText(copy.japanesePlacement.insufficient, { exact: true })).toBeVisible();
  await captureRelease(page, `JAPANESE-placement-timeout-${answered}`);
  await page.reload();
  expect((await (await page.request.get(`/api/japanese-placement/attempts/${staged.attemptId}`)).json()).result).toEqual(result.result);
  expect(profile(learner.id)).toEqual(englishBefore);
  if (answered === 11) {
    const retry = page.waitForResponse(response => response.url().endsWith("/api/japanese-placement/attempts") && response.request().method() === "POST");
    await page.getByRole("button", { name: copy.japanesePlacement.newStart, exact: true }).click();
    const response = await retry; expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: "IN_PROGRESS", answered: 0, total: 24 });
  }
});

test("study progress persists independently through deliberate subject and interface changes", async ({ page }) => {
  const learner = releaseStudent("study-student");
  expect(fixtureCommand("release-learning-state").states).toHaveLength(0);
  await signInMirrorUser(page, learner.email, "ENGLISH");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  const queue = page.waitForResponse(response => response.url().includes("/api/study/queue?"));
  await page.goto("/en/learn/study/BEGINNER_1/practice");
  await expect(page.locator("[data-study-beta]")).toHaveCount(0);
  expect((await queue).status()).toBe(200);
  const englishSaved = page.waitForResponse(response => response.url().endsWith("/api/study/review") && response.request().method() === "POST");
  await page.locator("main ul").filter({ has: page.getByRole("button") }).last().getByRole("button").first().press("Enter");
  expect((await englishSaved).status()).toBe(200);
  const englishState = fixtureCommand("release-learning-state");
  expect(englishState.states).toHaveLength(1);
  expect(englishState.states[0]).toMatchObject({ userId: learner.id, reps: 1, card: { deck: { level: { track: { learningLanguage: "ENGLISH" } } } } });
  await captureRelease(page, "ENGLISH-study-saved");
  await page.getByRole("link", { name: en.learningJourney.japanese.switch, exact: true }).click();
  expect((await (await page.request.get("/api/auth/session")).json()).user.learningLanguage).toBe("ENGLISH");
  await page.getByRole("button", { name: en.learningJourney.japanese.browse, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/book$/);
  expect((await (await page.request.get("/api/auth/session")).json()).user.learningLanguage).toBe("JAPANESE");
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto("/en/learn/study");
  await expect(page.locator('[data-state="unavailable"]')).toBeVisible();
  await captureRelease(page, "JAPANESE-study-unpublished");
  expect((await page.request.get("/api/study/overview")).status()).toBe(403);
  expect((await page.request.post("/api/japanese-study/queue", { data: { levelCode: "N5" } })).status()).toBe(503);
  fixtureCommand("release-study-publish");
  try {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/en/learn/study");
  await expect(page.getByRole("heading", { name: en.japaneseStudy.title, exact: true })).toBeVisible();
  await expect(page.locator("[data-study-beta]")).toHaveText(en.japaneseStudy.beta);
  await expect(page.locator('[data-state="unavailable"]')).toHaveCount(0);
  const notice = await page.request.get("/api/japanese-study/attribution");
  expect(notice.status()).toBe(200);
  expect(await notice.text()).toContain("https://www.edrdg.org/edrdg/licence.html");
  await expect(page.getByRole("link", { name: en.japaneseStudy.sources, exact: true })).toHaveAttribute("href", "/api/japanese-study/attribution");
  await captureRelease(page, "JAPANESE-study-beta-hub-desktop");
  expect((await page.request.post("/api/japanese-study/queue", { data: { levelCode: "N1" } })).status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 950 });
  await chooseInterfaceLocale(page, en.common, "ja");
  await setHeaderTheme(page, ja.common, "dark");
  const japaneseQueue = page.waitForResponse(response => response.url().endsWith("/api/japanese-study/queue") && response.request().method() === "POST");
  await page.goto("/learn/study/N5/practice?kind=kanji");
  await expect(page.locator("[data-study-beta]")).toHaveText(ja.japaneseStudy.beta);
  const queued = await japaneseQueue; expect(queued.status()).toBe(200);
  const issued = await queued.json() as JapaneseStudyQueue;
  const question = issued.cards[0].question;
  expect(question.task).toMatch(/^kanji_/);
  expect(JSON.stringify(issued)).not.toMatch(/correctChoiceId|answerJson|feedback|acceptedPairs/);
  await captureRelease(page, "JAPANESE-study-question");
  const answer = fixtureCommand("release-study-answer", { learnerId: learner.id, promptId: question.id });
  const japaneseSaved = page.waitForResponse(response => response.url().endsWith("/api/japanese-study/reviews") && response.request().method() === "POST");
  await page.getByRole("button", { name: question.choices.find(choice => choice.id === answer.choiceId)!.text, exact: true }).press("Enter");
  const review = await japaneseSaved; expect(review.status()).toBe(200);
  const result = await review.json();
  expect(result).toMatchObject({ correct: true, correctCount: 1, wrongCount: 0, feedback: { onyomi: expect.any(Array), kunyomi: expect.any(Array) } });
  await expect(page.getByRole("button", { name: ja.study.nextCard, exact: true })).toBeVisible();
  await captureRelease(page, "JAPANESE-study-feedback");
  const after = fixtureCommand("release-learning-state");
  expect(after.states).toHaveLength(2);
  expect(after.profiles).toEqual(englishState.profiles);
  expect(after.attempts).toEqual(englishState.attempts);
  expect(after.progress.find((row: { id: string }) => row.id === englishState.progress[0].id)).toEqual(englishState.progress[0]);
  expect(after.states.find((row: { cardId: string }) => row.cardId === englishState.states[0].cardId)).toEqual(englishState.states[0]);
  const repeated = await page.request.post("/api/japanese-study/reviews", { data: answer });
  expect(repeated.status()).toBe(200); expect(await repeated.json()).toEqual(result);
  expect(fixtureCommand("release-learning-state").states).toEqual(after.states);
  expect(fixtureCommand("release-learning-state").progress).toEqual(after.progress);
  expect((await page.request.post("/api/study/review", { data: { cardId: question.unitId, chosenAnswer: "forged" } })).status()).toBe(403);
  await page.reload();
  expect(fixtureCommand("release-learning-state").states).toEqual(after.states);
  await page.getByRole("link", { name: ja.learningJourney.english.switch, exact: true }).click();
  expect((await (await page.request.get("/api/auth/session")).json()).user.learningLanguage).toBe("JAPANESE");
  await page.getByRole("button", { name: ja.learningJourney.english.browse, exact: true }).click();
  await expect(page).toHaveURL(/\/book$/);
  await page.goto("/learn/study");
  const restored = await (await page.request.get("/api/study/overview")).json();
  expect(restored.levels.find((level: { levelCode: string }) => level.levelCode === "BEGINNER_1").xp).toBe(englishState.progress[0].xp);
  await expect(page.getByRole("heading", { name: ja.study.title, exact: true })).toBeVisible();
  await expect(page.locator("[data-study-beta]")).toHaveCount(0);
  expect((await page.request.get("/api/japanese-study")).status()).toBe(403);
  expect(fixtureCommand("release-learning-state").profiles).toEqual(after.profiles);
  } finally { fixtureCommand("release-study-hide"); }
});
