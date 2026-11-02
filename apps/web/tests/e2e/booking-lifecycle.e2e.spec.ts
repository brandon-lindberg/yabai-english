import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { signInMirrorUser, readMirrorFixtures, fixtureCommand } from "./helpers/mirror-fixtures";
import { captureRelease, releaseCases } from "./helpers/release-verification";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { dayKeyFromIso } from "../../src/lib/slot-calendar";

async function alerts(page: Page) {
  const response = await page.request.get("/api/notifications"); expect(response.status()).toBe(200);
  return (await response.json()).items as { titleEn: string; bodyEn: string }[];
}

for (const scenario of releaseCases()) test(`${scenario.language}: private lesson reschedules and cancellation notify both users, and availability controls the student option`, async ({ page, browser }) => {
  const fixture = readMirrorFixtures();
  const learner = fixture.users.find(user => user.id.endsWith(`-events-${scenario.language.toLowerCase()}`))!;
  const bookingId = `${fixture.runId}-events-${scenario.language.toLowerCase()}-booking`;
  const prefix = scenario.locale === "ja" ? "" : "/en";
  const copy = scenario.locale === "ja" ? ja : en;
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: scenario.width, height: 950 });
  await signInMirrorUser(page, learner.email, scenario.language);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  if (scenario.locale === "ja") await chooseInterfaceLocale(page, en.common, "ja");
  await setHeaderTheme(page, copy.common, scenario.theme);
  const teacherContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    await signInMirrorUser(teacher, fixture.users[scenario.teacher].email, scenario.language);
    await expect(teacher).toHaveURL(/\/en\/dashboard$/);
    const initialOptions = (await (await page.request.get(`/api/bookings/${bookingId}/reschedule`)).json()).slots;
    expect(initialOptions.length).toBeGreaterThan(0);
    fixtureCommand("release-notification-availability", { learnerId: learner.id, active: false });
    try {
      await page.goto(`${prefix}/dashboard/schedule`);
      await page.getByRole("button", { name: copy.booking.calendarMonth, exact: true }).click();
      const read = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/reschedule`));
      await page.locator(`[data-booking-id="${bookingId}"]`).first().click();
      expect((await read).status()).toBe(200);
      await expect(page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true })).toHaveCount(0);
      expect((await page.request.post(`/api/bookings/${bookingId}/reschedule`, { data: { startsAt: initialOptions[0].startsAtIso } })).status()).toBe(409);
    } finally { fixtureCommand("release-notification-availability", { learnerId: learner.id, active: true }); }
    await page.reload();
    await page.getByRole("button", { name: copy.booking.calendarMonth, exact: true }).click();
    const available = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/reschedule`));
    await page.locator(`[data-booking-id="${bookingId}"]`).first().click();
    const options = (await (await available).json()).slots as { startsAtIso: string }[];
    expect(options.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: copy.booking.calendarMonth, exact: true }).click();
    const month = page.getByRole("dialog").getByTestId("slot-calendar-month-grid");
    expect(await month.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await captureRelease(page, `${scenario.language}-student-reschedule`);
    await month.locator(`button[data-day-key="${dayKeyFromIso(options[0].startsAtIso, "Asia/Tokyo")}"]`).click();
    await page.getByRole("dialog").locator(`button[data-starts-at="${options[0].startsAtIso}"]`).first().click();
    const moved = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/reschedule`) && response.request().method() === "POST");
    await page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleSubmit, exact: true }).click();
    const moveResponse = await moved; expect(moveResponse.status()).toBe(200);
    expect(await moveResponse.json()).toMatchObject({ ok: true, calendarUpdated: true, booking: { id: bookingId, rescheduleCount: 1 } });
    for (const participant of [page, teacher]) {
      const items = await alerts(participant);
      expect(items.filter(item => item.titleEn === "Lesson reschedule requested")).toHaveLength(1);
      expect(items.filter(item => item.titleEn === "Lesson rescheduled")).toHaveLength(1);
    }
    const repeat = await page.request.post(`/api/bookings/${bookingId}/reschedule`, { data: { startsAt: options[0].startsAtIso } });
    expect(repeat.status()).toBe(200);
    expect((await alerts(page)).filter(item => item.titleEn === "Lesson rescheduled")).toHaveLength(1);
    const unavailable = await page.request.get(`/api/bookings/${bookingId}/reschedule`);
    expect((await unavailable.json()).slots).toEqual([]);
    const before = fixtureCommand("release-status").bookings.find((row: { id: string }) => row.id === bookingId);
    expect(before).toMatchObject({ status: "CONFIRMED", quotedPriceYen: 5000 }); expect(before.payments).toHaveLength(1);
    const cancellation = await page.request.post(`/api/bookings/${bookingId}/cancel`);
    expect(cancellation.status()).toBe(200);
    expect(await cancellation.json()).toMatchObject({ booking: { status: "CANCELLED" }, refund: { status: "PENDING_RECOVERY" } });
    for (const participant of [page, teacher]) {
      const items = await alerts(participant);
      expect(items.filter(item => item.titleEn === "Lesson cancelled")).toHaveLength(1);
      expect(items.filter(item => item.titleEn === "Lesson refund pending")).toHaveLength(1);
      expect(items.filter(item => item.titleEn === "Lesson refunded")).toHaveLength(0);
    }
    // Explicit synthetic settlement: no provider is contacted. Webhook wiring has separate unit coverage.
    fixtureCommand("release-notification-settle", { learnerId: learner.id });
    fixtureCommand("release-notification-settle", { learnerId: learner.id });
    for (const participant of [page, teacher]) expect((await alerts(participant)).filter(item => item.titleEn === "Lesson refunded")).toHaveLength(1);
    await page.getByRole("button", { name: new RegExp(copy.common.notifications) }).click();
    await expect(page.getByTestId("notification-panel").getByText(scenario.locale === "ja" ? "レッスンの返金が完了しました" : "Lesson refunded", { exact: true })).toBeVisible();
    await captureRelease(page, `${scenario.language}-student-lifecycle-notifications`);
    await teacher.getByRole("button", { name: /Notifications/ }).click();
    await expect(teacher.getByTestId("notification-panel").getByText("Lesson refunded", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await teacherContext.close(); }
});
