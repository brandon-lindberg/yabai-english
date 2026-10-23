import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import draft from "../../data/japanese-placement/review-bank.json";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";

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
function result(timeout = false) {
  return { attemptId: "browser-contract-attempt", completedAt: new Date().toISOString(), completionReason: timeout ? "time_limit" : "question_limit",
    levelEstimate: timeout ? { status: "insufficient_evidence", scope: "reading_writing", reason: "too_few_answers_or_domains" }
      : { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, modelRange: { lower: "N4", upper: "N3" } },
    domains: ["kana", "kanji_reading", "vocabulary", "grammar", "reading", "writing"].map((domain) => ({ domain, planned: 4,
      answered: timeout ? 0 : 4, correct: timeout ? 0 : 3, incorrect: timeout ? 0 : 1, notSure: 0, unanswered: timeout ? 4 : 0, observation: timeout ? "not_assessed" : "observed" })) };
}
function view(mode: Mode) {
  const now = Date.now();
  return { attemptId: "browser-contract-attempt", status: mode === "result" ? "COMPLETED" : "IN_PROGRESS", answered: mode === "result" ? 24 : mode === "tiles" ? 5 : 0, total: 24,
    expiresAt: new Date(now + (mode === "timeout" ? 700 : 1_200_000)).toISOString(), timeLimitSec: 1200, serverNow: new Date(now).toISOString(),
    question: mode === "result" ? null : question(mode === "tiles" ? writing : reading), result: mode === "result" ? result() : null };
}
async function signIn(page: Page, userIndex = 0) {
  await page.goto("/en/auth/signin?learningLanguage=JAPANESE&callbackUrl=%2Fen%2Fdashboard");
  await page.getByLabel(en.auth.email, { exact: true }).fill(fixtures.users[userIndex].email);
  await page.getByRole("button", { name: en.auth.signInWithEmail, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
}

test("real unavailable-bank state, separate subject route and eligible teacher context", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: en.japanesePlacement.open }).click();
  await page.getByRole("button", { name: en.japanesePlacement.start, exact: true }).click();
  await expect(page.getByText(en.japanesePlacement.unavailableTitle, { exact: true })).toBeVisible();
  expect((await page.request.get("/api/placement")).status()).toBe(403);
  const teacher = await page.context().browser()!.newContext();
  try {
    const teacherPage = await teacher.newPage();
    await signIn(teacherPage, 3);
    await teacherPage.goto(`/en/dashboard/students/${fixtures.users[0].id}`);
    await expect(teacherPage.getByText(en.japanesePlacement.teacherEmpty)).toBeVisible();
    expect((await teacherPage.request.get(`/api/teacher/students/${fixtures.users[0].id}/japanese-placement`)).status()).toBe(200);
    await teacherPage.goto("/en/japanese-placement");
    await expect(teacherPage).toHaveURL(/\/en\/dashboard$/);
  } finally { await teacher.close(); }
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
  await page.route("**/api/japanese-placement/attempts**", async (route) => {
    if (mode === "unavailable") { await route.fulfill({ status: 503, json: { error: "BANK_UNAVAILABLE" } }); return; }
    if (mode === "network") { await route.abort("failed"); return; }
    if (mode === "timeout" && !route.request().url().endsWith("/attempts")) { await route.fulfill({ json: { ...view("result"), answered: 0, result: result(true) } }); return; }
    await route.fulfill({ json: { attempt: mode === "intro" ? null : view(mode) } });
  });
  mkdirSync(screenshotDir, { recursive: true });
  const cases: Array<[Mode, "en" | "ja", number, "light" | "dark"]> = [
    ["intro", "en", 1440, "light"], ["intro", "en", 390, "dark"],
    ["choice", "en", 1440, "light"], ["choice", "en", 390, "dark"],
    ["tiles", "en", 1440, "light"], ["tiles", "en", 390, "dark"], ["tiles", "en", 524, "light"], ["tiles", "ja", 390, "light"], ["tiles", "ja", 524, "dark"],
    ["result", "en", 1440, "light"], ["result", "en", 390, "dark"], ["result", "ja", 524, "light"],
    ["timeout", "en", 390, "light"], ["unavailable", "en", 1440, "dark"], ["unavailable", "ja", 390, "light"], ["network", "en", 390, "dark"],
  ];
  for (const [state, locale, width, theme] of cases) {
    mode = state;
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
    else if (state === "result") await expect(page.getByText("N3", { exact: true })).toBeVisible();
    else if (state === "unavailable") await expect(page.getByText(copy.unavailableTitle, { exact: true })).toBeVisible();
    else if (state === "network") await expect(page.getByRole("alert")).toBeVisible();
    else await expect(page.getByRole("timer")).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${screenshotDir}/${state}-${locale}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
  }
  const teacher = await page.context().browser()!.newContext();
  try {
    const teacherPage = await teacher.newPage();
    await signIn(teacherPage, 3);
    for (const [locale, width, theme] of [["en", 1440, "light"], ["ja", 390, "dark"]] as const) {
      await teacherPage.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
      await teacherPage.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
      await teacherPage.evaluate((value) => localStorage.setItem("english-platform-theme", value), theme);
      await teacherPage.goto(`/${locale}/dashboard/students/${fixtures.users[0].id}`);
      await expect(teacherPage.getByText((locale === "ja" ? ja : en).japanesePlacement.teacherEmpty)).toBeVisible();
      await teacherPage.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await teacherPage.evaluate(() => document.fonts.ready);
      await teacherPage.screenshot({ path: `${screenshotDir}/teacher-empty-${locale}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
    }
  } finally { await teacher.close(); }
});
