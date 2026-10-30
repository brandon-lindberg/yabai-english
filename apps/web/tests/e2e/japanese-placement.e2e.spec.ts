import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { JapanesePlacementBank } from "../../src/lib/japanese-placement/bank";
import type { JapaneseAttemptView } from "../../src/lib/japanese-placement/public";
import draft from "../../data/japanese-placement/review-bank.json";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { fixtureCommand, signInMirrorUser } from "./helpers/mirror-fixtures";
import { chooseJapaneseAnswer } from "./helpers/placement-answers";

const manifest = "../../.impeccable/mirror-fixtures.json";
const available = existsSync(manifest);
test.skip(!available, "Create recorded --japanese-placement local fixtures first.");
const fixtures = JSON.parse(available ? readFileSync(manifest, "utf8") : '{"users":[]}') as { users: { id: string; email: string }[] };
const screenshotDir = "../../.impeccable/review/japanese-placement";
type Mode = "intro" | "choice" | "tiles" | "result" | "timeout" | "unavailable" | "network";
const reading = draft.items.find((item) => item.domain === "reading")!;
const writing = draft.items.find((item) => item.domain === "writing")!;
function question(item: typeof reading) {
  return { id: item.id, domain: item.domain, prompt: item.prompt, stimulus: item.stimulus,
    response: item.responseType === "choice" ? { kind: "choice", choices: item.choices } : { kind: "sentence_assembly", tiles: item.tiles } };
}
function result(timeout = false, attemptId = "browser-contract-attempt") {
  return { attemptId, completedAt: new Date().toISOString(), completionReason: timeout ? "time_limit" : "question_limit",
    levelEstimate: timeout ? { status: "insufficient_evidence", scope: "reading_writing", reason: "too_few_answers_or_domains" }
      : { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, basis: "jlpt_aligned_rules" },
    domains: ["kana", "kanji_reading", "vocabulary", "grammar", "reading", "writing"].map((domain) => ({ domain, planned: 4,
      answered: timeout ? 0 : 4, correct: timeout ? 0 : 3, incorrect: timeout ? 0 : 1, notSure: 0, unanswered: timeout ? 4 : 0, observation: timeout ? "not_assessed" : "observed" })) };
}
function view(mode: Mode, attemptId = "browser-contract-attempt") {
  const now = Date.now();
  return { attemptId, status: mode === "result" ? "COMPLETED" : "IN_PROGRESS", answered: mode === "result" ? 24 : mode === "tiles" ? 5 : 0, total: 24,
    expiresAt: new Date(now + (mode === "timeout" ? 700 : 1_200_000)).toISOString(), timeLimitSec: 1200, serverNow: new Date(now).toISOString(),
    question: mode === "result" ? null : question(mode === "tiles" ? writing : reading), result: mode === "result" ? result(false, attemptId) : null };
}
async function signIn(page: Page, userIndex = 0) {
  const language = [1, 2].includes(userIndex) ? "ENGLISH" : "JAPANESE";
  await signInMirrorUser(page, fixtures.users[userIndex].email, language);
  const origin = new URL(page.url()).origin;
  await expect(page).toHaveURL(`${origin}/en/${userIndex === 1 ? "onboarding" : "dashboard"}`);
}

async function switchLocale(page: Page, from: "en" | "ja", to: "en" | "ja") {
  const copy = from === "ja" ? ja.common : en.common;
  await page.getByRole("button", { name: copy.accountMenu, exact: true }).click();
  await page.getByRole("button", { name: copy.locale, exact: true }).click();
  await page.getByRole("button", { name: to === "ja" ? "日本語" : "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", to);
}

test("published bank completes through the student UI, resumes and shares only the automatic result with its eligible teacher", async ({ page }) => {
  const bank: JapanesePlacementBank = JSON.parse(execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/audit-japanese-placement-content.ts", "--rubric-bank"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const englishBefore = fixtureCommand("placement-status");
  await signIn(page);
  await page.getByRole("link", { name: en.japanesePlacement.open, exact: true }).click();
  await expect(page.getByRole("heading", { name: en.japanesePlacement.title, exact: true })).toBeVisible();
  const startReply = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/japanese-placement/attempts"));
  await page.getByRole("button", { name: new RegExp(`^(${en.japanesePlacement.start}|${en.japanesePlacement.newStart})$`) }).click();
  let current: JapaneseAttemptView = await (await startReply).json();
  expect(current).toMatchObject({ status: "IN_PROGRESS", answered: 0, total: 24, timeLimitSec: 1200 });
  const deadline = current.expiresAt;
  const resumedId = current.question!.id;
  await page.reload();
  const resumed = (await (await page.request.get("/api/japanese-placement/attempts")).json()).attempt;
  expect(resumed).toMatchObject({ attemptId: current.attemptId, expiresAt: deadline, answered: 0, question: { id: resumedId } });
  const bands = new Set<string>();
  const passages = new Set<string>();
  let resumedTiles = false;
  while (current.question) {
    expect(JSON.stringify(current)).not.toMatch(/correctChoiceId|acceptedOrders|referenceBand|passageId|calibration|ownerRelease/);
    const item = bank.items.find((row) => row.id === current.question!.id)!;
    if (item.domain !== "kana") bands.add(item.referenceBand!);
    if (item.passageId) { expect(passages.has(item.passageId)).toBe(false); passages.add(item.passageId); }
    const response = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith(`/api/japanese-placement/attempts/${current.attemptId}/responses`));
    await chooseJapaneseAnswer(page, current.question, item, true, async position => {
      if (!resumedTiles && position === 1) {
        await page.reload();
        await expect(page.getByRole("group", { name: en.japanesePlacement.sentence, exact: true }).getByRole("button")).toHaveCount(2);
        await switchLocale(page, "en", "ja");
        await expect(page.getByRole("group", { name: ja.japanesePlacement.sentence, exact: true }).getByRole("button")).toHaveCount(2);
        await expect(page).toHaveURL(/\/japanese-placement$/);
        await switchLocale(page, "ja", "en");
        await expect(page.getByRole("group", { name: en.japanesePlacement.sentence, exact: true }).getByRole("button")).toHaveCount(2);
        expect((await (await page.request.get(`/api/japanese-placement/attempts/${current.attemptId}`)).json()).expiresAt).toBe(deadline);
        resumedTiles = true;
      }
    });
    const reply = await response;
    expect(reply.ok()).toBe(true);
    current = await reply.json();
    expect(current.expiresAt).toBe(deadline);
  }
  expect(resumedTiles).toBe(true);
  expect([...bands]).toEqual(expect.arrayContaining(["N3", "N2", "N1"]));
  expect(current).toMatchObject({ status: "COMPLETED", answered: 24, result: { completionReason: "question_limit", levelEstimate: { status: "estimated", band: "N1", basis: "jlpt_aligned_rules" } } });
  await expect(page.getByText("N1", { exact: true })).toBeVisible();
  await expect(page.getByText(en.japanesePlacement.ruleBasis, { exact: true })).toBeVisible();
  expect(fixtureCommand("placement-status")).toEqual(englishBefore);
  await page.reload();
  await expect(page.getByText("N1", { exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/japanese-placement/attempts/${current.attemptId}`)).json()).result).toEqual(current.result);
  expect((await page.request.get("/api/placement")).status()).toBe(403);
  for (const userIndex of [3, 2, 4, 1]) {
    const context = await page.context().browser()!.newContext();
    try {
      const other = await context.newPage();
      await signIn(other, userIndex);
      if (userIndex === 3) {
        const teacherResult = await other.request.get(`/api/teacher/students/${fixtures.users[0].id}/japanese-placement`);
        expect(teacherResult.status()).toBe(200);
        expect((await teacherResult.json()).result).toEqual(current.result);
        await other.goto(`/en/dashboard/students/${fixtures.users[0].id}`);
        await expect(other.getByText("N1", { exact: true })).toBeVisible();
        await expect(other.getByText(en.japanesePlacement.ruleBasis, { exact: true })).toBeVisible();
        await other.goto("/en/japanese-placement");
        await expect(other).toHaveURL(/\/en\/dashboard$/);
        expect((await other.request.get("/api/japanese-placement/attempts")).status()).toBe(403);
      } else if (userIndex === 2) {
        expect((await other.request.get(`/api/teacher/students/${fixtures.users[0].id}/japanese-placement`)).status()).toBe(404);
      } else {
        expect((await other.request.get(`/api/japanese-placement/attempts/${current.attemptId}`)).status()).toBe(userIndex === 4 ? 404 : 403);
      }
    } finally { await context.close(); }
  }
  const guest = await page.context().browser()!.newContext();
  try { expect((await guest.request.get(new URL("/api/japanese-placement/attempts", page.url()).toString())).status()).toBe(401); }
  finally { await guest.close(); }
});

test("real server deadline automatically finalizes an owned near-expiry attempt", async ({ page }) => {
  await signIn(page, 4);
  const staged = fixtureCommand("placement-timeout");
  await page.goto("/en/japanese-placement");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText(en.japanesePlacement.insufficient, { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(en.japanesePlacement.timeExpired, { exact: true })).toBeVisible();
  const expired = await (await page.request.get(`/api/japanese-placement/attempts/${staged.attemptId}`)).json();
  expect(expired).toMatchObject({ status: "COMPLETED", answered: 0, expiresAt: staged.expiresAt, result: { completionReason: "time_limit", levelEstimate: { status: "insufficient_evidence" } } });
  const late = await page.request.post(`/api/japanese-placement/attempts/${staged.attemptId}/responses`, { data: { kind: "skip", itemId: reading.id, reason: "not_sure" } });
  expect(late.status()).toBe(200);
  expect((await late.json()).result).toEqual(expired.result);
  expect((await (await page.request.get(`/api/japanese-placement/attempts/${staged.attemptId}`)).json()).answered).toBe(0);
  await page.reload();
  await expect(page.getByText(en.japanesePlacement.insufficient, { exact: true })).toBeVisible();
});

test("authenticated Japanese dashboard exposes its assessment entry", async ({ page }) => {
  await signIn(page);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user?.id).toBe(fixtures.users[0].id);
  await expect(page.getByRole("link", { name: en.japanesePlacement.open, exact: true })).toBeVisible();
});

test("Japanese default-locale assessment resolves without a redirect loop", async ({ page }) => {
  await signIn(page);
  await page.goto("/ja/japanese-placement");
  await expect(page).toHaveURL(/\/japanese-placement$/);
  await expect(page.getByRole("heading", { name: ja.japanesePlacement.title, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: ja.japanesePlacement.sources, exact: true })).toBeVisible();
});

test("keyboard sentence assembly, resume and automatic timeout follow the public API contract", async ({ page }) => {
  await signIn(page);
  let mode: Mode = "intro";
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/japanese-placement/attempts**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") { payloads.push(req.postDataJSON()); mode = mode === "intro" ? "choice" : mode === "choice" ? "tiles" : "result"; }
    if (mode === "timeout" && !req.url().endsWith("/attempts")) {
      await route.fulfill({ json: { ...view("result"), answered: 0, result: result(true) } }); return;
    }
    const value = mode === "intro" ? null : view(mode);
    await route.fulfill({ json: req.method() === "GET" && req.url().endsWith("/attempts") ? { attempt: value } : value });
  });
  await page.goto("/en/japanese-placement");
  await page.getByRole("button", { name: en.japanesePlacement.start, exact: true }).click();
  await page.getByRole("button", { name: reading.choices![0].text, exact: true }).click();
  await expect(page.getByRole("button", { name: en.japanesePlacement.submitSentence })).toBeDisabled();
  for (const id of writing.acceptedOrders![0]) {
    const index = writing.tiles!.findIndex((tile) => tile.id === id);
    const button = page.getByRole("button", { name: en.japanesePlacement.addTile.replace("{tile}", writing.tiles![index].text).replace("{position}", String(index + 1)), exact: true });
    await button.focus(); await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: en.japanesePlacement.submitSentence }).click();
  await expect(page.getByText("N3", { exact: true })).toBeVisible();
  await expect(page.getByText(en.japanesePlacement.ruleBasis, { exact: true })).toBeVisible();
  await expect(page.getByText(/Estimated range:/)).toHaveCount(0);
  expect(payloads.at(-1)).toEqual({ kind: "sentence_assembly", itemId: writing.id, tileIds: writing.acceptedOrders![0] });
  expect(payloads[0]).toEqual({ requestId: expect.stringMatching(/^[a-f0-9-]{36}$/) });
  mode = "tiles";
  await page.reload();
  await expect(page.getByRole("button", { name: en.japanesePlacement.submitSentence })).toBeVisible();
  mode = "timeout";
  await page.reload();
  await expect(page.getByText(en.japanesePlacement.insufficient, { exact: true })).toBeVisible();
});

test("bounded screenshot matrix", async ({ page }) => {
  test.skip(!process.env.JAPANESE_PLACEMENT_CAPTURE, "Opt-in visual capture pass.");
  await signIn(page);
  let mode: Mode = "intro";
  let captureAttemptId = "browser-capture";
  await page.route("**/api/japanese-placement/attempts**", async (route) => {
    if (mode === "unavailable") { await route.fulfill({ status: 503, json: { error: "BANK_UNAVAILABLE" } }); return; }
    if (mode === "network") { await route.abort("failed"); return; }
    if (mode === "timeout" && !route.request().url().endsWith("/attempts")) { await route.fulfill({ json: { ...view("result", captureAttemptId), answered: 0, result: result(true, captureAttemptId) } }); return; }
    await route.fulfill({ json: { attempt: mode === "intro" ? null : view(mode, captureAttemptId) } });
  });
  mkdirSync(screenshotDir, { recursive: true });
  const allCases: Array<[Mode, "en" | "ja", number, "light" | "dark"]> = [
    ["intro", "en", 1440, "light"], ["intro", "en", 390, "dark"],
    ["choice", "en", 1440, "light"], ["choice", "en", 390, "dark"],
    ["tiles", "en", 1440, "light"], ["tiles", "en", 390, "dark"], ["tiles", "en", 524, "light"], ["tiles", "ja", 390, "light"], ["tiles", "ja", 524, "dark"],
    ["result", "en", 1440, "light"], ["result", "en", 390, "dark"], ["result", "ja", 524, "light"], ["result", "ja", 390, "dark"],
    ["timeout", "en", 390, "light"], ["unavailable", "en", 1440, "dark"], ["unavailable", "ja", 390, "light"], ["network", "en", 390, "dark"],
  ];
  const resultsOnly = process.env.JAPANESE_PLACEMENT_CAPTURE_RESULTS_ONLY === "1";
  const cases = resultsOnly ? allCases.filter(([state]) => state === "result") : allCases;
  for (const [state, locale, width, theme] of cases) {
    mode = state;
    captureAttemptId = `browser-capture-${state}-${locale}-${width}-${theme}`;
    await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.evaluate((value) => localStorage.setItem("english-platform-theme", value), theme);
    await page.goto(`/${locale}/japanese-placement`);
    const copy = locale === "ja" ? ja.japanesePlacement : en.japanesePlacement;
    await expect(page.locator("main")).toBeVisible();
    if (state === "tiles") {
      const tile = writing.tiles![0];
      await page.getByRole("button", { name: copy.addTile.replace("{tile}", tile.text).replace("{position}", "1"), exact: true }).click();
    } else if (state === "timeout") await expect(page.getByText(copy.insufficient, { exact: true })).toBeVisible();
    else if (state === "intro") await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeVisible();
    else if (state === "result") {
      await expect(page.getByText("N3", { exact: true })).toBeVisible();
      await expect(page.getByText(copy.ruleBasis, { exact: true })).toBeVisible();
    }
    else if (state === "unavailable") await expect(page.getByText(copy.unavailableTitle, { exact: true })).toBeVisible();
    else if (state === "network") await expect(page.getByRole("alert")).toBeVisible();
    else await expect(page.getByRole("timer")).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${screenshotDir}/${state}-${locale}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
  }
  if (resultsOnly) return;
  const teacher = await page.context().browser()!.newContext();
  try {
    const teacherPage = await teacher.newPage();
    await signIn(teacherPage, 3);
    for (const [locale, width, theme] of [["en", 1440, "light"], ["ja", 390, "dark"]] as const) {
      await teacherPage.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
      await teacherPage.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
      await teacherPage.evaluate((value) => localStorage.setItem("english-platform-theme", value), theme);
      await teacherPage.goto(`/${locale}/dashboard/students/${fixtures.users[0].id}`);
      const saved = await (await teacherPage.request.get(`/api/teacher/students/${fixtures.users[0].id}/japanese-placement`)).json();
      if (saved.result?.levelEstimate?.status === "estimated") await expect(teacherPage.getByText(saved.result.levelEstimate.band, { exact: true })).toBeVisible();
      else await expect(teacherPage.getByText((locale === "ja" ? ja : en).japanesePlacement.teacherEmpty)).toBeVisible();
      await teacherPage.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await teacherPage.evaluate(() => document.fonts.ready);
      expect(await teacherPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await teacherPage.screenshot({ path: `${screenshotDir}/teacher-${saved.result ? "result" : "empty"}-${locale}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
    }
  } finally { await teacher.close(); }
});
