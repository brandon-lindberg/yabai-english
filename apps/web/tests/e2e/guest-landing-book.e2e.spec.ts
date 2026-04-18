import { expect, test } from "@playwright/test";

test.describe("guest landing and public book funnel", () => {
  test("landing shows primary heading and browse teachers link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /browse teachers|講師を見る/i })).toBeVisible();
  });

  test("guest book page shows teacher directory", async ({ page }) => {
    await page.goto("/book");
    await expect(page).not.toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("browse teachers CTA links to book (not sign-in)", async ({ page }) => {
    await page.goto("/en");
    const browse = page.getByRole("link", { name: /browse teachers|講師を見る/i });
    await expect(browse).toHaveAttribute("href", /\/book$/);
    await browse.click();
    await expect(page).not.toHaveURL(/\/auth\/signin/);
    await expect(page).toHaveURL(/\/book/);
  });

  test("header Find teachers links to book for guests", async ({ page }) => {
    await page.goto("/en");
    const findTeachers = page.getByRole("link", { name: /^Find teachers$|^講師を探す$/i });
    await expect(findTeachers).toHaveAttribute("href", /\/book$/);
  });
});
