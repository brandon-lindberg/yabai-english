import { expect, test } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { fixtureCommand, readMirrorFixtures, releaseStudent, signInMirrorUser } from "./helpers/mirror-fixtures";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease } from "./helpers/release-verification";

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
    const sections = page.getByRole("navigation", { name: copy.dashboard.nav.ariaLabel });
    const overview = sections.getByRole("link", { name: copy.dashboard.nav.overview });
    await expect(overview).toHaveAttribute("aria-current", "page");
    const sectionLinks = [copy.dashboard.nav.overview, copy.dashboard.nav.schedule,
      copy.dashboard.nav.profile, copy.dashboard.nav.achievements, copy.dashboard.nav.myTeachers];
    if (japanese) {
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        const rows = await sections.getByRole("link").evaluateAll(links =>
          links.map(link => link.getBoundingClientRect().top));
        expect(new Set(rows).size, `Dashboard tabs stay on one row at ${width}px`).toBe(1);
        for (const name of sectionLinks) {
          const link = sections.getByRole("link", { name, exact: true });
          await expect(link.locator("svg[aria-hidden=true]")).toBeVisible();
          await expect(link.getByText(name, { exact: true })).toBeHidden();
          const bounds = (await link.boundingBox())!;
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
      }
    } else {
      for (const name of sectionLinks) {
        await expect(sections.getByRole("link", { name, exact: true }).getByText(name, { exact: true })).toBeVisible();
      }
    }
    await captureRelease(page, `learner-dashboard-tabs-${japanese ? "phone" : "desktop"}`);
    const dashboard = page.url();
    const recent = page.getByRole("region", { name: copy.dashboard.highlights.recentAchievements });
    await expect(recent).toHaveCount(0);
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
    await page.goto(`/${japanese ? "ja" : "en"}/dashboard/art-gallery?page=5`);
    const anniversary = japanese ? "ここがしっくり" : "Getting Comfortable";
    const threshold = japanese ? /直近3か月のうち2か月以上/ : /at least 2 of the last 3 months/;
    await expect(page.getByRole("heading", { name: anniversary })).toBeVisible();
    await expect(page.getByText(threshold)).toHaveCount(0);
    await page.getByRole("link", { name: new RegExp(anniversary) }).click();
    const conditions = page.getByText(japanese ? "詳しい条件" : "What counts?", { exact: true });
    await expect(conditions).toBeVisible();
    await expect(page.getByText(threshold)).toBeHidden();
    await conditions.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(threshold)).toBeVisible();
    await page.getByRole("link", { name: copy.artGallery.back }).click();
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
      await page.goto(dashboard);
      await expect(recent.getByRole("link")).toHaveCount(1);
      const badge = recent.getByRole("link", { name: "こんにちは、冒険！" });
      await expect(badge).toHaveCSS("width", "44px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await badge.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { level: 1, name: "こんにちは、冒険！" })).toBeVisible();
    } else {
      await expect(page.getByText(copy.artGallery.empty)).toBeVisible();
      await expect(page.getByRole("link", { name: copy.artGallery.study })).toBeVisible();
    }
  });
}

test("art gallery shows three recent achievements beside Study rank on phones", async ({ page }) => {
  const learner = readMirrorFixtures().users[0];
  await page.setViewportSize({ width: 320, height: 844 });
  await signInMirrorUser(page, learner.email, "ENGLISH");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  const ids: string[] = fixtureCommand("release-dashboard-achievements", { learnerId: learner.id });
  const requestedArt = new Set<string>();
  page.on("request", request => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/achievements/")) requestedArt.add(pathname);
  });
  await page.reload();

  const recent = page.getByRole("region", { name: en.dashboard.highlights.recentAchievements });
  const rank = page.getByText(en.dashboard.highlights.statRank, { exact: true }).locator("..");
  const links = recent.getByRole("link");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const visibleIds = ids.slice(0, width < 768 ? 3 : 5);
    await expect(links).toHaveCount(visibleIds.length);
    expect(await links.evaluateAll(items => items.map(item => new URL((item as HTMLAnchorElement).href).searchParams.get("piece")))).toEqual(visibleIds);
    expect(new Set(await links.evaluateAll(items => items.map(item => item.getBoundingClientRect().top))).size).toBe(1);
    await expect(rank).toBeVisible();
    const rankElement = (await rank.elementHandle())!;
    const alignment = await recent.evaluate((achievements, rankCell) => {
      const rankBounds = rankCell.getBoundingClientRect();
      const achievementBounds = achievements.getBoundingClientRect();
      return {
        beside: achievementBounds.left >= rankBounds.right - 1,
        sameRow: achievementBounds.top >= rankBounds.top && achievementBounds.bottom <= rankBounds.bottom,
      };
    }, rankElement);
    await rankElement.dispose();
    expect(alignment, `Achievements are beside Study rank at ${width}px`).toEqual({ beside: true, sameRow: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await recent.scrollIntoViewIfNeeded();
    await expect.poll(() => [...requestedArt].sort()).toEqual(visibleIds.map(id => `/achievements/${id}.png`).sort());
    await captureRelease(page, `achievement-ledger-${width}`);
  }
});
