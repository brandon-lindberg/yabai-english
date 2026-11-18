/* Run from any directory with the app's Playwright dependency and Chromium installed. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../../../apps/web/node_modules/playwright");

const root = path.resolve(__dirname, "../../..");
const previewUrl =
  "https://preview.invalid/docs/design/achievements/index.html";

async function check(browser, width, mature) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    colorScheme: width === 390 ? "dark" : "light",
    reducedMotion: "reduce",
    hasTouch: width === 390,
  });
  const badgeBytes = new Map();
  try {
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, "https://preview.invalid");
      const file = path.resolve(root, "." + url.pathname);
      assert(file.startsWith(root + path.sep));
      const mime = {
        ".js": "text/javascript",
        ".png": "image/png",
        ".css": "text/css",
        ".html": "text/html",
      };
      const body = fs.readFileSync(file);
      if (url.pathname.includes("/native/"))
        badgeBytes.set(url.pathname, body.length);
      if (mature && file === path.join(__dirname, "preview.js")) {
        // Seed only this fresh browser's sample account before the first paint.
        const script = body.toString();
        assert.match(script, /\nrender\(\);\s*$/);
        return route.fulfill({
          contentType: mime[".js"],
          body: script.replace(
            /\nrender\(\);\s*$/,
            "\nprogress.ja.earned = catalogue.map(card => card.id);\nrender();",
          ),
        });
      }
      return route.fulfill({ contentType: mime[path.extname(file)], body });
    });
    await page.goto(previewUrl + (width === 390 ? "?lang=ja" : ""));
    await page.waitForLoadState("networkidle");
    const tiles = page.locator(".grid [data-detail]");
    const cold = {
      width,
      mature,
      tiles: await tiles.count(),
      nativeRequests: badgeBytes.size,
      nativeBytes: [...badgeBytes.values()].reduce(
        (sum, bytes) => sum + bytes,
        0,
      ),
    };
    console.log(JSON.stringify(cold));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert(
      cold.nativeRequests <= 9 && cold.tiles <= 8,
      "First paint must fit one featured piece and at most eight tiles",
    );
    if (!mature) {
      await page.locator('#nav [data-action="dashboard"]').click();
      await page.locator("#review").click();
      const beforeSave = badgeBytes.size;
      await page.locator("#answer").click();
      await page.locator("#toast-action").waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(
        badgeBytes.size,
        beforeSave,
        "A popup needs only its thumbnail",
      );
      await page.locator("#toast-action").click();
      assert(await page.locator("dialog[open]").isVisible());
      await page.keyboard.press("Escape");
      assert(
        await page
          .locator("#saved")
          .evaluate((el) => el === document.activeElement),
      );
    } else {
      const collected = new Set();
      for (const tab of ["earned", "all"]) {
        collected.clear();
        await page.locator('[data-action="' + tab + '"]').click();
        const feature = page.locator("#featured [data-detail]");
        if (await feature.count())
          collected.add(await feature.getAttribute("data-detail"));
        for (;;) {
          const ids = await tiles.evaluateAll((items) =>
            items.map((item) => item.dataset.detail),
          );
          assert(ids.length > 0 && ids.length <= 8);
          for (const id of ids) {
            assert(
              !collected.has(id),
              "Adjacent pages must contain distinct badges",
            );
            collected.add(id);
          }
          const next = page.locator('[data-action="next-page"]');
          if (!(await next.count())) break;
          if (width === 390) await next.tap();
          else await next.click();
          assert(
            await tiles.first().evaluate((el) => el === document.activeElement),
          );
        }
        assert.equal(
          collected.size,
          36,
          "All visible artworks must remain reachable",
        );
        await page.locator('[data-action="previous-page"]').click();
        assert.equal(await tiles.count(), 8);
      }
      await page.locator("#filter").selectOption("loyalty");
      assert.equal(await tiles.count(), 3);
      await page.locator("#subject").selectOption("en");
      await page.locator('[data-action="earned"]').click();
      assert(await page.locator("#empty").isVisible());
    }
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    channel: process.env.CHROME_CHANNEL || "chrome",
  });
  try {
    const results = await Promise.allSettled(
      [390, 1280].flatMap((width) =>
        [false, true].map((mature) => check(browser, width, mature)),
      ),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        "Gallery checks failed",
      );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
