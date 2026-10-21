import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { chooseInterfaceLocale, closeHeaderMenu, openHeaderMenu, setHeaderTheme } from "./helpers/header-preferences";

test("desktop preferences use icons in the main row and preserve signup intent", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/auth/signin?learningLanguage=JAPANESE&callbackUrl=%2Fbook");
  await expect(page.getByRole("button", { name: en.common.locale, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.common.menu, exact: true })).toBeHidden();
  expect((await page.locator("header").boundingBox())!.height).toBeLessThanOrEqual(76);
  await setHeaderTheme(page, en.common, "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await openHeaderMenu(page, en.common);
  await expect(page.getByRole("button", { name: en.common.switchToLight, exact: true })).toBeVisible();
  await closeHeaderMenu(page, en.common);
  await page.setViewportSize({ width: 1440, height: 900 });
  await chooseInterfaceLocale(page, en.common, "ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  expect(new URL(page.url()).searchParams.get("learningLanguage")).toBe("JAPANESE");
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe("/book");
});

test("mobile preferences are hidden until the menu opens; theme survives refresh", async ({ page }) => {
  for (const width of [320, 390, 524, 664]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/en");
    await expect(page.getByRole("link", { name: en.common.signIn, exact: true })).toBeVisible();
    expect((await page.locator("header").boundingBox())!.height).toBeLessThanOrEqual(76);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: en.common.locale, exact: true })).toBeHidden();
    await openHeaderMenu(page, en.common);
    await expect(page.getByRole("link", { name: en.common.becomeTeacher, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: en.common.locale, exact: true })).toBeVisible();
    await setHeaderTheme(page, en.common, "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await openHeaderMenu(page, en.common);
    await page.getByRole("button", { name: en.common.locale, exact: true }).click();
    await page.getByRole("button", { name: "日本語", exact: true }).press("Escape");
    await expect(page.getByRole("button", { name: en.common.locale, exact: true })).toBeFocused();
    await page.getByRole("button", { name: en.common.locale, exact: true }).press("Escape");
    await expect(page.getByRole("button", { name: en.common.menu, exact: true })).toBeFocused();
    await openHeaderMenu(page, en.common);
    await page.getByRole("heading", { level: 1 }).click({ position: { x: 1, y: 1 } });
    await expect(page.getByRole("button", { name: en.common.locale, exact: true })).toBeHidden();
  }
});

test("mobile locale changes preserve the Japanese learning path", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/learn-japanese");
  await chooseInterfaceLocale(page, en.common, "ja");
  await expect(page).toHaveURL(/\/learn-japanese$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("日本語");
  await openHeaderMenu(page, ja.common);
  await closeHeaderMenu(page, ja.common);
  await expect(page.getByRole("button", { name: ja.common.locale, exact: true })).toBeHidden();
});

test("capture compact header states", async ({ browser }, testInfo) => {
  test.skip(testInfo.config.updateSnapshots !== "all", "Use --update-snapshots for the explicit bounded visual pass.");
  const directory = "../../.impeccable/review/header";
  mkdirSync(directory, { recursive: true });
  for (const width of [320, 390, 524, 664, 1440]) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        await page.goto("/en");
        await expect(page.getByRole("link", { name: en.common.signIn, exact: true })).toBeVisible();
        await setHeaderTheme(page, en.common, theme);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${directory}/root-${width}-${theme}.png`, animations: "disabled" });
        if (width === 1440 && theme === "light") await page.screenshot({ path: `${directory}/header-desktop.png`, clip: { x: 0, y: 0, width, height: 80 }, animations: "disabled" });
        if (width < 768) await openHeaderMenu(page, en.common);
        else await page.getByRole("button", { name: en.common.locale, exact: true }).click();
        await page.screenshot({ path: `${directory}/open-${width}-${theme}.png`, animations: "disabled" });
        if (width === 390 && theme === "light") await page.screenshot({ path: `${directory}/header-mobile.png`, clip: { x: 0, y: 0, width, height: 300 }, animations: "disabled" });
        await page.goto("/ja/learn-english");
        await setHeaderTheme(page, ja.common, theme);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${directory}/japanese-${width}-${theme}.png`, animations: "disabled" });
      } finally { await context.close(); }
    }
  }
});
