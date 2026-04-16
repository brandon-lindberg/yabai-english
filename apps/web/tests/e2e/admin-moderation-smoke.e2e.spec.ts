import { expect, test } from "@playwright/test";

test.describe("admin moderation and user APIs", () => {
  test("GET /api/admin/users returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/admin/users");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/reports/chat-threads returns 401 without session", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/reports/chat-threads");
    expect(res.status()).toBe(401);
  });

  test("unauthenticated visitor cannot stay on admin UI", async ({ page }) => {
    await page.goto("/en/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin");
  });
});
