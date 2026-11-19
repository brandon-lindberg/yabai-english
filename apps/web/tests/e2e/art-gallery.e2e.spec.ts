import { expect, test } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { readMirrorFixtures, releaseStudent, signInMirrorUser } from "./helpers/mirror-fixtures";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";

for (const japanese of [false, true]) {
  test(`art gallery shows ${japanese ? "a returning Japanese learner's collection on mobile" : "locked achievements on a new English dashboard"}`, async ({ page }) => {
    const copy = japanese ? ja : en;
    const learner = japanese ? readMirrorFixtures().users[0] : releaseStudent("insufficient-english");
    await page.setViewportSize({ width: japanese ? 390 : 1280, height: 844 });
    const art = new Set<string>();
    page.on("request", request => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith("/achievements/")) art.add(pathname);
    });
    await signInMirrorUser(page, learner.email, japanese ? "JAPANESE" : "ENGLISH");
    await expect(page).toHaveURL(/\/en\/dashboard$/);
    if (japanese) {
      await chooseInterfaceLocale(page, en.common, "ja");
      await setHeaderTheme(page, ja.common, "dark");
    }
    const tab = page.getByRole("link", { name: copy.dashboard.nav.achievements, exact: true });
    await expect(tab).toBeVisible();
    expect(art.size).toBe(0);
    await tab.click();
    await expect(page.getByRole("heading", { name: copy.artGallery.title })).toBeVisible();
    await expect(tab).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(japanese ? copy.artGallery.japanese : copy.artGallery.english)).toBeVisible();
    const works = page.locator('main img[src^="/achievements/"]');
    await expect(works).toHaveCount(8);
    await expect(works.first()).toHaveCSS("filter", "grayscale(1)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(art.size).toBeLessThanOrEqual(8);
    await page.getByRole("link", { name: copy.artGallery.next, exact: true }).click();
    await expect(page.getByRole("heading", { name: japanese ? "記憶の宮殿" : "Mind Palace" })).toBeVisible();
    await page.getByRole("link", { name: copy.artGallery.collected, exact: true }).click();
    if (japanese) {
      await expect(works).toHaveCount(1);
      await expect(works.first()).toHaveCSS("filter", "none");
      await page.locator('a[href*="piece=lessons-0001"]').click();
      await expect(page.getByRole("heading", { level: 1, name: "こんにちは、冒険！" })).toBeVisible();
      await page.reload();
      await expect(page.getByText(/コレクションに追加/)).toBeVisible();
      await page.getByRole("link", { name: copy.artGallery.back }).click();
      await expect(works).toHaveCount(1);
    } else {
      await expect(page.getByText(copy.artGallery.empty)).toBeVisible();
      await expect(page.getByRole("link", { name: copy.artGallery.study })).toBeVisible();
    }
  });
}
