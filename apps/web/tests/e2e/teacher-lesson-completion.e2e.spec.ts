import { test, expect } from "@playwright/test";
import en from "../../messages/en.json";
import { readMirrorFixtures, signInMirrorUser, fixtureCommand } from "./helpers/mirror-fixtures";
import { captureRelease, releaseCases } from "./helpers/release-verification";

for (const scenario of releaseCases()) test(`${scenario.language}: its teacher saves completed-lesson notes and the student reads the saved result`, async ({ page, browser }) => {
  const fixture = readMirrorFixtures();
  const bookingId = fixture.pastBookings![scenario.language];
  const notes = `${scenario.language} private lesson: practiced sentence structure.`;
  await page.setViewportSize({ width: scenario.width, height: 950 });
  await signInMirrorUser(page, fixture.users[scenario.teacher].email, scenario.language);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await page.goto("/en/dashboard/schedule/completed");
  const lesson = page.locator(`[id="booking-${bookingId}"]`);
  await lesson.getByRole("button").first().press("Enter");
  const editor = lesson.locator('[contenteditable="true"]');
  await editor.fill(notes);
  const saved = page.waitForResponse(res => res.url().endsWith(`/api/bookings/${bookingId}/completion-notes`) && res.request().method() === "PATCH");
  await lesson.getByRole("button", { name: en.dashboard.schedulePage.lessonNotesSave, exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(lesson.getByText(en.dashboard.schedulePage.lessonNotesSaved, { exact: true })).toBeVisible();
  await captureRelease(page, `${scenario.language}-teacher-notes`);
  await page.reload();
  await lesson.getByRole("button").first().click();
  await expect(lesson.locator('[contenteditable="true"]')).toContainText(notes);
  const context = await browser.newContext();
  try {
    const student = await context.newPage();
    await signInMirrorUser(student, fixture.users[0].email, "JAPANESE");
    await expect(student).toHaveURL(/\/en\/dashboard$/);
    await student.goto("/en/dashboard/schedule/completed");
    await expect(student.getByText(notes, { exact: true })).toBeVisible();
    expect((await student.request.patch(`/api/bookings/${bookingId}/completion-notes`, { data: { completionNotesMd: "forged" } })).status()).toBe(403);
    await captureRelease(student, `${scenario.language}-student-notes`);
  } finally { await context.close(); }
  const otherTeacher = await browser.newContext();
  try {
    const other = await otherTeacher.newPage();
    await signInMirrorUser(other, fixture.users[scenario.teacher === 2 ? 3 : 2].email, scenario.language);
    await expect(other).toHaveURL(/\/en\/dashboard$/);
    expect((await other.request.patch(`/api/bookings/${bookingId}/completion-notes`, { data: { completionNotesMd: "forged" } })).status()).toBe(403);
  } finally { await otherTeacher.close(); }
  const persisted = fixtureCommand("release-status").bookings.find((row: { id: string }) => row.id === bookingId);
  expect(persisted).toMatchObject({ learningLanguage: scenario.language, completionNotesMd: notes, externalTranscriptUrl: null });
  await page.goto(`/en/dashboard/schedule/lessons/${bookingId}`);
  await expect(page.getByRole("heading", { level: 1, name: scenario.language === "JAPANESE" ? "無料トライアル（30分） / Free trial (30 min)" : "ローカル検証体験レッスン / Local QA free trial", exact: true })).toBeVisible();
  await captureRelease(page, `${scenario.language}-teacher-lesson-detail`);
});
