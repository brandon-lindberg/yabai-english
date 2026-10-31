import { test, expect } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { readMirrorFixtures, signInMirrorUser, fixtureCommand } from "./helpers/mirror-fixtures";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease, releaseCases } from "./helpers/release-verification";

for (const scenario of releaseCases()) test(`${scenario.language}: fresh teacher onboarding opens setup steps and preserves progress`, async ({ page }) => {
  const fixture = readMirrorFixtures();
  const teacher = fixture.users.find(user => user.id.endsWith(`-new-${scenario.language === "JAPANESE" ? "japanese" : "english"}-teacher`))!;
  const copy = scenario.locale === "ja" ? ja : en;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: scenario.width, height: 950 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scenario.theme });
  await signInMirrorUser(page, teacher.email, scenario.language);
  await expect(page).toHaveURL(/\/onboarding\/teacher$/);
  if (scenario.locale === "ja") await chooseInterfaceLocale(page, en.common, "ja");
  await setHeaderTheme(page, copy.common, scenario.theme);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.onboarding.teacherTitle);
  await captureRelease(page, `${scenario.language}-teacher-onboarding`);

  for (const step of ["profile", "payments", "integrations", "availability", "students", "notes"] as const) {
    await page.getByTestId(`step-card-${step}`).getByRole("link", { name: copy.onboarding.teacherOpenStep, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/[^?]*)?\?/);
    // The original profile flow opens its editor immediately during onboarding.
    if (step === "profile") {
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").press("Escape");
    }
    if (step === "integrations") await expect(page).toHaveURL(/tab=google/);
    await page.getByRole("link", { name: copy.onboarding.resumeCta, exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/teacher\?/);
  }
  const materials = page.getByTestId("step-card-materials");
  if (scenario.language === "JAPANESE") {
    await expect(materials).toContainText(copy.onboarding.teacherMaterialsUnavailable);
    await expect(materials.getByRole("link")).toHaveCount(0);
  } else {
    await materials.getByRole("link", { name: copy.onboarding.teacherOpenStep, exact: true }).click();
    await expect(page).toHaveURL(/\/learn\/study\?/);
    await page.getByRole("link", { name: copy.onboarding.resumeCta, exact: true }).click();
  }

  // A checkbox remains stored without finishing or skipping the whole flow.
  const saved = page.waitForResponse(res => res.url().endsWith("/api/onboarding/skip-step") && res.request().method() === "POST");
  await page.getByTestId("step-status-chat").check();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId("step-status-chat")).toBeChecked();
  const before = fixtureCommand("release-status").users.find((user: { id: string }) => user.id === teacher.id);
  expect(before.teacherProfile.onboardingCompletedAt).toBeNull();
  // A default English learner preference must not expose English materials to a Japanese-only teacher.
  expect(before.learningLanguage).toBe("ENGLISH");
  await page.getByTestId("teacher-onboarding-skip").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixtureCommand("release-status").users.find((user: { id: string }) => user.id === teacher.id).teacherProfile.onboardingCompletedAt).toBeTruthy();
  expect(errors).toEqual([]);
});
