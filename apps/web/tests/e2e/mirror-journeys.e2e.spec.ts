import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";

const manifestPath = "../../.impeccable/mirror-fixtures.json";
const fixturesAvailable = existsSync(manifestPath);
test.skip(!fixturesAvailable, "Create the disposable local mirror fixtures before running this suite.");
const fixture = JSON.parse(fixturesAvailable ? readFileSync(manifestPath, "utf8") : '{"users":[]}') as {
  users: Array<{ id: string; email: string }>; englishTeacherId: string; japaneseTeacherId: string;
};
async function signIn(page: Page, email: string, language: "ENGLISH" | "JAPANESE") {
  await page.goto(`/en/auth/signin?learningLanguage=${language}&callbackUrl=%2Fen%2Fdashboard`);
  await page.getByLabel(en.auth.email, { exact: true }).fill(email);
  await page.getByRole("button", { name: en.auth.signInWithEmail, exact: true }).click();
}

test("root offers two clear routes; changing UI locale preserves the Japanese journey", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.learningJourney.choiceTitle);
  await page.getByRole("link", { name: /^Learn Japanese/ }).click();
  await expect(page).toHaveURL(/\/en\/learn-japanese$/);
  await chooseInterfaceLocale(page, en.common, "ja");
  await expect(page).toHaveURL(/\/learn-japanese$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("日本語");
  await page.reload();
  await expect(page.getByRole("link", { name: "日本語の学習を始める", exact: true })).toHaveAttribute("href", /learningLanguage=JAPANESE/);
});

test("the Japanese headline has no isolated final character at the user's viewport", async ({ page }) => {
  await page.setViewportSize({ width: 524, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ja/learn-english");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("英語");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [390, 524, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const phraseLines = await page.locator("h1 [aria-hidden='true'] span").evaluateAll((spans) => {
      const glyphs = spans.filter((span) => span.children.length === 0 && span.textContent?.trim());
      return ["講師", "英語"].map((phrase) => {
        const tops = Array.from(phrase).map((char) => Math.round(glyphs.find((span) => span.textContent === char)!.getBoundingClientRect().top));
        return new Set(tops).size;
      });
    });
    expect(phraseLines).toEqual([1, 1]);
  }
  const finalLineLength = await page.locator("h1 [aria-hidden='true'] span").evaluateAll((spans) => {
    const lines = new Map<number, number>();
    for (const span of spans.filter((span) => span.children.length === 0 && span.textContent?.trim())) {
      const top = Math.round(span.getBoundingClientRect().top);
      lines.set(top, (lines.get(top) ?? 0) + 1);
    }
    return lines.get(Math.max(...lines.keys())) ?? 0;
  });
  expect(finalLineLength).toBeGreaterThan(1);
});

test("guest discovery and direct teacher access keep the chosen subject after refresh", async ({ page }) => {
  await page.goto("/en/learn-japanese");
  await page.getByRole("button", { name: en.learningJourney.japanese.browse, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/book$/);
  await expect(page.getByText("Mirror QA Japanese Teacher", { exact: true })).toBeVisible();
  await expect(page.getByText("Mirror QA English Teacher", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.learningJourney.japanese.browse);
  // An async notFound() can be streamed with HTTP 200; assert the rendered denial.
  await page.goto(`/en/book/teachers/${fixture.englishTeacherId}`);
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.getByText("Mirror QA English Teacher", { exact: true })).toHaveCount(0);
  await page.goto("/en/book?learningLanguage=ENGLISH");
  await expect(page.getByText("Mirror QA English Teacher", { exact: true })).toHaveCount(0);
});

test("a first sign-in saves Japanese before onboarding and restores its draft across UI locale changes", async ({ page }) => {
  await signIn(page, fixture.users[1].email, "JAPANESE");
  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.learningJourney.japanese.onboarding);
  await page.getByRole("combobox").selectOption("Europe/London");
  await page.getByRole("button", { name: en.onboarding.wizardNext, exact: true }).click();
  await expect(page.getByRole("group", { name: en.onboarding.goalsLabel })).toBeVisible();
  await page.getByText(en.common.accountMenu, { exact: true }).click();
  await chooseInterfaceLocale(page, en.common, "ja");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("group", { name: ja.onboarding.goalsLabel })).toBeVisible();
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user.learningLanguage).toBe("JAPANESE");
  // Stop before consent: this test verifies the journey, not a person's agreement.
});

test("an existing English learner can deliberately select Japanese without reusing English progress", async ({ page }) => {
  await signIn(page, fixture.users[0].email, "JAPANESE");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.learningJourney.japanese.dashboard);
  await expect(page.getByRole("link", { name: en.common.placement, exact: true })).toHaveCount(0);
  await expect(page.getByText("Advanced 3", { exact: false })).toHaveCount(0);
  expect((await page.request.get("/api/placement")).status()).toBe(403);
  expect((await page.request.get("/api/study/overview")).status()).toBe(403);
  const products = await (await page.request.get("/api/lesson-products")).json();
  const response = await page.request.post("/api/bookings", { data: { lessonProductId: products[0].id, teacherProfileId: fixture.englishTeacherId, startsAt: new Date(Date.now() + 8 * 86400_000).toISOString() } });
  expect(response.status()).toBe(409);
  await page.goto("/en/learn-english");
  await page.getByRole("link", { name: en.learningJourney.english.start, exact: true }).click();
  await page.getByRole("button", { name: en.learningJourney.english.browse, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/book$/);
  expect((await (await page.request.get("/api/auth/session")).json()).user.learningLanguage).toBe("ENGLISH");
});

test("a teacher must explicitly choose the subject when adding a class", async ({ page }) => {
  await signIn(page, fixture.users[3].email, "JAPANESE");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await page.goto("/en/dashboard/lessons");
  await page.getByRole("button", { name: en.dashboard.profilePage.teacherIndividualRatesAdd, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: en.dashboard.profilePage.teacherRateYenLabelTaxIncluded }).fill("5000");
  const save = dialog.getByRole("button", { name: en.dashboard.profilePage.teacherAddClassConfirm, exact: true });
  await expect(save).toBeDisabled();
  await dialog.getByLabel(en.learningJourney.languageTaught).selectOption("JAPANESE");
  const pending = page.waitForResponse((response) => response.url().endsWith("/api/teacher/lesson-offerings") && response.request().method() === "POST");
  await save.click();
  const response = await pending;
  const result = await response.json();
  expect(response.status()).toBe(200);
  expect(result.offering.learningLanguage).toBe("JAPANESE");
  // Only the newly-created, unscheduled fixture class is removed here.
  await page.request.delete(`/api/teacher/lesson-offerings/${result.offering.id}`);
});

test("capture the two established-world landing variants in a bounded viewport/theme matrix", async ({ browser }) => {
  test.skip(process.env.MIRROR_CAPTURE !== "1", "Visual capture is an explicit bounded pass.");
  const dir = "../../.impeccable/review/mirror";
  mkdirSync(dir, { recursive: true });
  for (const [slug, locale] of [["learn-english", "ja"], ["learn-japanese", "en"]] as const) {
    for (const width of [1440, 390, 524]) {
      for (const theme of width === 524 ? ["light"] as const : ["light", "dark"] as const) {
        const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, locale, colorScheme: theme, reducedMotion: "reduce" });
        try {
          const page = await context.newPage();
          await page.goto(`http://localhost:3100${locale === "en" ? "/en" : ""}/${slug}`);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expect(page.getByRole("link", { name: locale === "en" ? en.common.signIn : "ログイン", exact: true })).toBeVisible();
          const messages = locale === "en" ? en : ja;
          await setHeaderTheme(page, messages.common, theme);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.screenshot({ path: `${dir}/${slug}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
        } finally { await context.close(); }
      }
    }
  }
  for (const width of [1440, 390]) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, locale: "en", colorScheme: theme, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        for (const [name, path] of [["choice", "/en"], ["japanese-signin", "/en/auth/signin?learningLanguage=JAPANESE"]]) {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await setHeaderTheme(page, en.common, theme);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.screenshot({ path: `${dir}/${name}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
        }
      } finally { await context.close(); }
    }
  }
});
