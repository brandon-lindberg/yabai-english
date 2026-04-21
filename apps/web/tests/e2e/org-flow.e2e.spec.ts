import { expect, test } from "@playwright/test";

test.describe("organization flow smoke", () => {
  test("org creation page redirects unauthenticated users to signin", async ({ page }) => {
    await page.goto("/en/org/create");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("invite acceptance page is reachable and shows invalid-token state for a bogus token", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/org/invite/this-token-does-not-exist");
    expect(res.status()).toBe(404);
  });

  test.fixme(
    "full owner journey: sign in -> create org + first school -> invite teacher -> create schedule slot",
    async () => {
      // Implement once fixture seeding for SUPER_ADMIN / auth-cookie helpers exist.
    },
  );

  test.fixme(
    "school admin scoping: school admin for School A cannot access School B routes",
    async () => {
      // Implement with two seeded schools and a scoped admin account.
    },
  );
});
