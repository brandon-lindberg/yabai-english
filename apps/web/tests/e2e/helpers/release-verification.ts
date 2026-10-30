import { mkdirSync, writeFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { readMirrorFixtures } from "./mirror-fixtures";

export const releaseCases = () => {
  const fixture = readMirrorFixtures();
  return [
    { language: "ENGLISH", student: 1, teacher: 2, teacherId: fixture.englishTeacherId, width: 1440, locale: "en", theme: "light" },
    { language: "JAPANESE", student: 5, teacher: 3, teacherId: fixture.japaneseTeacherId, width: 390, locale: "ja", theme: "dark" },
  ] as const;
};

export async function captureRelease(page: Page, name: string) {
  if (process.env.MIRROR_RELEASE_CAPTURE !== "1") return;
  const dir = "../../.impeccable/review/release";
  mkdirSync(dir, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  // Full-page captures should show sticky chrome at the page origin.
  await page.evaluate(() => { window.scrollTo(0, 0); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const metrics = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
    theme: document.documentElement.dataset.theme, locale: document.documentElement.lang, font: getComputedStyle(document.body).fontFamily }));
  expect(metrics.overflow).toBe(false);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true, animations: "disabled" });
  await page.keyboard.press("Tab");
  const dialog = page.getByRole("dialog");
  const control = await dialog.isVisible() ? dialog.getByRole("button").first() : page.getByRole("button").first();
  await control.focus();
  const focus = await control.evaluate(el => ({ width: getComputedStyle(el).outlineWidth, style: getComputedStyle(el).outlineStyle }));
  expect(focus.style).not.toBe("none");
  writeFileSync(`${dir}/${name}.json`, JSON.stringify({ ...metrics, focus }, null, 2));
}
