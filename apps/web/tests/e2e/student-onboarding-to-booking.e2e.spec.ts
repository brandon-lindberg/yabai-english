import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { AVAILABILITY_WINDOW_MONTHS } from "../../src/lib/availability-window";
import { readMirrorFixtures, followMirrorGoogleSignIn, fixtureCommand } from "./helpers/mirror-fixtures";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease, releaseCases } from "./helpers/release-verification";

async function chooseBookingTime(page: Page, copy: typeof en.booking, startsAtUtc: string) {
  await page.getByRole("button", { name: copy.calendarMonth, exact: true }).click();
  const month = page.getByTestId("slot-calendar-month-grid");
  await expect(month).toBeVisible();
  const slot = month.locator(`button[data-starts-at*="T${startsAtUtc}"]`).first();
  const firstDay = month.locator("[data-month-day-cell]").first();

  // The release bookings can occupy the last paid Monday in the first month.
  for (let remaining = AVAILABILITY_WINDOW_MONTHS; remaining > 1 && !(await slot.isVisible()); remaining--) {
    const previousDay = await firstDay.getAttribute("data-month-day-cell");
    await page.getByRole("button", { name: copy.next, exact: true }).click();
    if (previousDay) await expect(firstDay).not.toHaveAttribute("data-month-day-cell", previousDay);
  }

  await expect(slot, `Expected an open ${startsAtUtc} UTC slot within the booking window`).toBeVisible();
  await slot.click();
}

for (const scenario of releaseCases()) test(`${scenario.language}: landing, onboarding, private trial and unpaid checkout stay in the chosen subject`, async ({ page }) => {
  const fixture = readMirrorFixtures();
  const copy = scenario.locale === "ja" ? ja : en;
  const prefix = scenario.locale === "ja" ? "" : "/en";
  const note = `Isolated ${scenario.language} onboarding verification`;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: scenario.width, height: 950 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scenario.theme });
  await page.goto(`/en/learn-${scenario.language === "JAPANESE" ? "japanese" : "english"}`);
  await followMirrorGoogleSignIn(page, fixture.users[scenario.student].email, () =>
    page.getByRole("link", { name: scenario.language === "JAPANESE" ? en.learningJourney.japanese.start : en.learningJourney.english.start, exact: true }).click());
  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await page.getByRole("combobox").selectOption(scenario.locale === "ja" ? "Asia/Tokyo" : "Europe/London");
  await page.getByRole("button", { name: en.onboarding.wizardNext, exact: true }).click();
  await page.getByRole("textbox").fill(note);
  if (scenario.locale === "ja") {
    await chooseInterfaceLocale(page, en.common, "ja");
    await expect(page.getByRole("textbox")).toHaveValue(note);
    await expect(page.getByRole("button", { name: copy.common.accountMenu, exact: true })).toBeVisible();
  }
  await setHeaderTheme(page, copy.common, scenario.theme);
  await captureRelease(page, `${scenario.language}-onboarding-goals`);
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: copy.onboarding.wizardNext, exact: true }).click();
  await expect(page.getByRole("button", { name: copy.onboarding.submit, exact: true })).toBeDisabled();
  // Explicit consent belongs only to these synthetic, disposable accounts.
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
  const saved = page.waitForResponse(res => res.url().endsWith("/api/onboarding") && res.request().method() === "POST");
  await page.getByRole("button", { name: copy.onboarding.submit, exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page).toHaveURL(/\/onboarding\/next$/);
  await expect(page.getByTestId("student-onboarding-progress-label")).toHaveText(copy.onboarding.progressSummary.replace("{current}", "1").replace("{total}", "6"));
  const placement = page.getByTestId("step-card-placement");
  await expect(placement).toHaveAttribute("href", new RegExp(scenario.language === "JAPANESE" ? "/japanese-placement\\?" : "/placement\\?"));
  await expect(page.getByTestId("step-card-placement")).toHaveAttribute("data-completed", "false");
  const materials = page.getByTestId("step-card-materials");
  if (scenario.language === "JAPANESE") {
    await expect(materials).toContainText(copy.onboarding.materialsUnavailable);
    await expect(materials).not.toHaveAttribute("href");
  } else await expect(materials).toHaveAttribute("href", /\/learn\/study\?/);
  await captureRelease(page, `${scenario.language}-onboarding-checklist`);
  await placement.click();
  await expect(page).toHaveURL(new RegExp(scenario.language === "JAPANESE" ? "/japanese-placement\\?" : "/placement\\?"));
  await page.getByRole("link", { name: copy.onboarding.resumeCta, exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/next$/);
  await page.getByTestId("step-card-chat").click();
  const removeDemo = page.getByRole("button", { name: copy.chat.demo.remove, exact: true });
  await expect(page.getByRole("heading", { name: copy.chat.demo.teacher, exact: true })).toBeVisible();
  await expect(page.getByText(copy.chat.demo.question, { exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-composer")).toHaveCount(0);
  await captureRelease(page, `${scenario.language}-onboarding-chat-demo`);
  await page.getByRole("button", { name: copy.chat.backToThreads, exact: true }).click();
  await page.getByRole("button", { name: `${copy.chat.demo.teacher} ${copy.chat.demo.readOnly}` }).click();
  await removeDemo.click();
  await expect(page.getByText(copy.chat.noThreads, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: copy.chat.close, exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/next$/);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user.learningLanguage).toBe(scenario.language);
  await page.getByTestId("step-card-bookLesson").click();
  const teacherName = `Mirror QA ${scenario.language === "JAPANESE" ? "Japanese" : "English"} Teacher`;
  const teachers = page.getByTestId("teacher-rows");
  const teacherRow = teachers.locator(`[data-row-id="${scenario.teacherId}"]`);
  await expect(teacherRow.getByRole("heading", { name: teacherName, exact: true })).toBeVisible();
  await expect(teachers.getByRole("heading", { name: `Mirror QA ${scenario.language === "JAPANESE" ? "English" : "Japanese"} Teacher`, exact: true })).toHaveCount(0);
  await teacherRow.getByRole("link", { name: copy.booking.teacherCardViewProfile, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(teacherName);
  await chooseBookingTime(page, copy.booking, "02:00");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/30/).first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: copy.booking.confirm, exact: true })).toBeEnabled();
  await captureRelease(page, `${scenario.language}-trial-review`);
  const booked = page.waitForResponse(res => res.url().endsWith("/api/bookings") && res.request().method() === "POST");
  await dialog.getByRole("button", { name: copy.booking.confirm, exact: true }).press("Enter");
  const reply = await booked;
  expect(reply.status()).toBe(200);
  const booking = await reply.json();
  expect(booking).toMatchObject({ learningLanguage: scenario.language, status: "CONFIRMED", teacherId: scenario.teacherId, quotedPriceYen: 0, meetUrl: null, googleEventId: null });
  await expect(dialog.getByText(copy.booking.success, { exact: true })).toBeVisible();
  await page.goto(`${prefix}/dashboard`);
  await expect(page.getByText(teacherName, { exact: true }).first()).toBeVisible();
  await captureRelease(page, `${scenario.language}-confirmed`);
  await page.goto(`${prefix}/book/teachers/${scenario.teacherId}`);
  await chooseBookingTime(page, copy.booking, "01:00");
  const pending = page.waitForResponse(res => res.url().endsWith("/api/bookings") && res.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: copy.booking.confirm, exact: true }).click();
  const pendingReply = await pending;
  expect(pendingReply.status()).toBe(200);
  const payment = await pendingReply.json();
  expect(payment.requiresPayment).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/book/checkout/${payment.bookingId}$`));
  const pay = page.getByRole("button", { name: copy.booking.payNow, exact: true });
  await expect(pay).toBeDisabled();
  await page.getByRole("checkbox").check();
  const unavailable = page.waitForResponse(res => res.url().endsWith(`/api/bookings/${payment.bookingId}/pay`));
  await pay.click();
  expect((await unavailable).status()).toBe(503);
  await expect(page.getByRole("alert").filter({ hasText: "Stripe is not configured" })).toBeVisible();
  await captureRelease(page, `${scenario.language}-checkout`);
  const status = fixtureCommand("release-status");
  expect(status.users.find((user: { id: string }) => user.id === fixture.users[scenario.student].id).studentProfile).toMatchObject({ learningGoalsNote: note });
  expect(status.bookings.find((row: { id: string }) => row.id === booking.id).invoice).toMatchObject({ amountYen: 0 });
  const held = status.bookings.find((row: { id: string }) => row.id === payment.bookingId);
  expect(held).toMatchObject({ learningLanguage: scenario.language, status: "PENDING_PAYMENT", quotedPriceYen: 5000 });
  expect(held.payments).toHaveLength(1);
  expect(held.payments[0]).toMatchObject({ status: "CREATED", amountYen: 5000 });
  const calendar = await page.request.get(`/api/bookings/ics?bookingId=${payment.bookingId}`);
  expect(calendar.status()).toBe(200);
  expect(await calendar.text()).toContain(scenario.language === "JAPANESE" ? "Japanese conversation — 60 min (日本語会話（60分）)" : "Local QA lesson (ローカル検証レッスン)");
  expect(status.draft.publicationStatus).toBe("DRAFT");
  const wrongSubject = await page.request.get(scenario.language === "JAPANESE" ? "/api/placement" : "/api/japanese-placement/attempts");
  expect(wrongSubject.status()).toBe(403);
  if (scenario.language === "JAPANESE") expect((await page.request.get("/api/japanese-study")).status()).toBe(503);
  else expect((await page.request.get("/api/placement")).status()).toBe(200);
  expect(errors).toEqual([]);
});
