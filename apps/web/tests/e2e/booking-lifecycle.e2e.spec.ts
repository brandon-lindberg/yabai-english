import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { signInMirrorUser, readMirrorFixtures, fixtureCommand } from "./helpers/mirror-fixtures";
import { captureRelease, releaseCases } from "./helpers/release-verification";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { dayKeyFromIso } from "../../src/lib/slot-calendar";
import { DateTime } from "luxon";

async function alerts(page: Page) {
  const response = await page.request.get("/api/notifications"); expect(response.status()).toBe(200);
  return (await response.json()).items as { titleEn: string; bodyEn: string; bodyJa: string }[];
}

async function openLearner(page: Page, email: string, scenario: ReturnType<typeof releaseCases>[number]) {
  await page.setViewportSize({ width: scenario.width, height: 950 });
  await signInMirrorUser(page, email, scenario.language);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  // Exercise a React control before native details menus or screenshot styles
  // can change server markup while its client handlers are still hydrating.
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(page.getByTestId("notification-panel")).toBeVisible();
  await page.getByRole("button", { name: /Notifications/ }).click();
  if (scenario.locale === "ja") await chooseInterfaceLocale(page, en.common, "ja");
  await setHeaderTheme(page, scenario.locale === "ja" ? ja.common : en.common, scenario.theme);
}

for (const scenario of releaseCases()) test(`${scenario.language}: private lesson reschedules and cancellation notify both users, and availability controls the student option`, async ({ page, browser }) => {
  const fixture = readMirrorFixtures();
  const learner = fixture.users.find(user => user.id.endsWith(`-events-${scenario.language.toLowerCase()}`))!;
  const bookingId = `${fixture.runId}-events-${scenario.language.toLowerCase()}-booking`;
  const prefix = scenario.locale === "ja" ? "" : "/en";
  const copy = scenario.locale === "ja" ? ja : en;
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await openLearner(page, learner.email, scenario);
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
      await page.locator(`[data-booking-id="${bookingId}"]`).first().click();
      await expect(page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true })).toHaveCount(0);
      const read = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/reschedule`));
      await page.getByRole("dialog").getByRole("button", { name: copy.dashboard.cancelBooking, exact: true }).click();
      expect((await read).status()).toBe(200);
      await expect(page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true })).toHaveCount(0);
      expect((await page.request.post(`/api/bookings/${bookingId}/reschedule`, { data: { startsAt: initialOptions[0].startsAtIso } })).status()).toBe(409);
    } finally { fixtureCommand("release-notification-availability", { learnerId: learner.id, active: true }); }
    await page.reload();
    await page.getByRole("button", { name: copy.booking.calendarMonth, exact: true }).click();
    await page.locator(`[data-booking-id="${bookingId}"]`).first().click();
    const available = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/reschedule`));
    await page.getByRole("dialog").getByRole("button", { name: copy.dashboard.cancelBooking, exact: true }).click();
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
      expect(items.filter(item => item.titleEn === "Lesson reschedule requested")).toHaveLength(0);
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
    for (const participant of [page, teacher]) {
      const notices = (await alerts(participant)).filter(item => item.titleEn === "Lesson refunded");
      expect(notices).toHaveLength(1);
      if (participant === page) {
        expect(notices[0].bodyEn).toContain("Please check your account.");
        expect(notices[0].bodyEn).not.toMatch(/5,000|5000|¥|￥/);
        expect(notices[0].bodyJa).not.toMatch(/5,000|5000|¥|￥/);
      } else expect(notices[0].bodyEn).toContain("5,000");
    }
    await page.getByRole("button", { name: new RegExp(copy.common.notifications) }).click();
    await expect(page.getByTestId("notification-panel").getByText(scenario.locale === "ja" ? "レッスンの返金が完了しました" : "Lesson refunded", { exact: true })).toBeVisible();
    await captureRelease(page, `${scenario.language}-student-lifecycle-notifications`);
    await teacher.getByRole("button", { name: /Notifications/ }).click();
    await expect(teacher.getByTestId("notification-panel").getByText("Lesson refunded", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await teacherContext.close(); }
});

const savedBooking = (id: string) => fixtureCommand("release-status").bookings.find((row: { id: string }) => row.id === id);
async function cancelLate(page: Page, bookingId: string, copy: typeof en | typeof ja) {
  await page.getByRole("button", { name: copy.dashboard.cancelBooking, exact: true }).first().click();
  const response = page.waitForResponse(response => response.url().endsWith(`/api/bookings/${bookingId}/cancel`) && response.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: copy.dashboard.privateReschedule.lateCancelAction, exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("dialog").getByText(copy.dashboard.privateReschedule.requestSent, { exact: true })).toBeVisible();
}

for (const scenario of releaseCases()) test(`${scenario.language}: late cancellation requests a replacement without refunding, and published times restore the booking`, async ({ page }) => {
  const fixture = readMirrorFixtures();
  const learner = fixture.users.find(user => user.id.endsWith(`-cancel-late-${scenario.language.toLowerCase()}`))!;
  const bookingId = `${fixture.runId}-cancel-late-${scenario.language.toLowerCase()}-booking`;
  const copy = scenario.locale === "ja" ? ja : en;
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const saved = () => savedBooking(bookingId);
  const original = saved();
  await openLearner(page, learner.email, scenario);
  await expect(page.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: copy.dashboard.cancelBooking, exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: copy.dashboard.privateReschedule.lateCancelAction, exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: copy.dashboard.cancelBookingKeep, exact: true }).click();
  expect(saved()).toEqual(original);

  fixtureCommand("release-notification-availability", { learnerId: learner.id, active: false });
  try {
    await cancelLate(page, bookingId, copy);
    await expect(dialog.getByText(copy.dashboard.privateReschedule.noAvailability, { exact: true })).toBeVisible();
    expect(saved()).toMatchObject({ status: "CANCELLED", privateRescheduleStatus: "PENDING", startsAt: original.startsAt, refunds: [] });
    expect(saved().payments).toEqual(original.payments);
    await captureRelease(page, `${scenario.language}-late-request-created`);
    await dialog.getByRole("button", { name: copy.dashboard.cancelBookingDone, exact: true }).click();
    const prefix = scenario.locale === "ja" ? "" : "/en";
    await page.goto(`${prefix}/dashboard/schedule/reschedule`);
    const row = page.locator(`[data-private-request="${bookingId}"]`);
    await expect(row.getByText(copy.dashboard.privateReschedule.pendingStatus, { exact: true })).toBeVisible();
    await expect(row.getByText(copy.dashboard.privateReschedule.noAvailability, { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: copy.dashboard.privateReschedule.refundAction, exact: true })).toHaveCount(0);
    await expect(row.getByText(copy.dashboard.privateReschedule.refundTeacherHelp, { exact: true })).toHaveCount(0);
    expect((await page.request.post(`/api/bookings/${bookingId}/reschedule-request`, { data: { action: "refund" } })).status()).toBe(404);
    await captureRelease(page, `${scenario.language}-student-pending-request`);
  } finally { fixtureCommand("release-notification-availability", { learnerId: learner.id, active: true }); }
  await page.reload();
  const slots = (await (await page.request.get(`/api/bookings/${bookingId}/reschedule`)).json()).slots as { startsAtIso: string }[];
  expect(slots.length).toBeGreaterThan(0);
  const row = page.locator(`[data-private-request="${bookingId}"]`);
  await row.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleTitle, exact: true }).click();
  await row.locator(`button[data-starts-at="${slots[0].startsAtIso}"]`).click();
  await row.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleSubmit, exact: true }).click();
  await expect(row.getByText(copy.dashboard.privateReschedule.rescheduledStatus, { exact: true })).toBeVisible();
  const moved = saved();
  expect(moved).toMatchObject({ status: "CONFIRMED", privateRescheduleStatus: "RESCHEDULED", startsAt: slots[0].startsAtIso, quotedPriceYen: 5000, rescheduleCount: 1 });
  expect(moved.payments).toEqual(original.payments);
  expect(moved.refunds).toEqual([]);
  expect((await alerts(page)).map(item => item.titleEn)).toEqual(expect.arrayContaining(["Lesson cancelled", "Lesson reschedule requested", "Lesson rescheduled"]));

  await page.goto(`${scenario.locale === "ja" ? "" : "/en"}/dashboard`);
  await page.getByRole("button", { name: copy.dashboard.cancelBooking, exact: true }).first().click();
  await dialog.getByRole("button", { name: copy.dashboard.cancelBookingRefund, exact: true }).click();
  await expect(dialog.getByText(copy.dashboard.cancelBookingRefundPending, { exact: true })).toBeVisible();
  await captureRelease(page, `${scenario.language}-cancel-refund-pending`);
  await dialog.getByRole("button", { name: copy.dashboard.cancelBookingDone, exact: true }).click();
  expect(saved().status).toBe("CANCELLED");
  expect((await alerts(page)).map(item => item.titleEn)).toEqual(expect.arrayContaining(["Lesson cancelled", "Lesson refund pending", "Lesson rescheduled"]));
  expect(errors).toEqual([]);
});

for (const scenario of releaseCases()) for (const action of ["reschedule", "close", "refund"] as const) test(`${scenario.language}: teacher resolves a late cancellation by ${action}`, async ({ page, browser }) => {
  const fixture = readMirrorFixtures();
  const kind = action === "reschedule" ? "cancel-teacher" : `cancel-${action}`;
  const learner = fixture.users.find(user => user.id.endsWith(`-${kind}-${scenario.language.toLowerCase()}`))!;
  const bookingId = `${fixture.runId}-${kind}-${scenario.language.toLowerCase()}-booking`;
  const copy = scenario.locale === "ja" ? ja : en;
  const prefix = scenario.locale === "ja" ? "" : "/en";
  await openLearner(page, learner.email, scenario);
  await cancelLate(page, bookingId, copy);
  await page.getByRole("dialog").getByRole("button", { name: copy.dashboard.cancelBookingDone, exact: true }).click();
  await page.goto(`${prefix}/dashboard/schedule/reschedule`);
  const slots = (await (await page.request.get(`/api/bookings/${bookingId}/reschedule`)).json()).slots as { startsAtIso: string }[];
  expect(slots.length).toBeGreaterThan(0);
  const teacherContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    await openLearner(teacher, fixture.users[scenario.teacher].email, scenario);
    const errors: string[] = [];
    teacher.on("pageerror", error => errors.push(error.message));
    teacher.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await teacher.goto(`${prefix}/dashboard/schedule/reschedule`);
    const row = teacher.locator(`[data-private-request="${bookingId}"]`);
    await expect(row.getByText(copy.dashboard.privateReschedule.pendingStatus, { exact: true })).toBeVisible();
    await captureRelease(teacher, `${scenario.language}-teacher-request-${action}`);
    if (action === "reschedule") {
      await row.locator('input[type="datetime-local"]').fill(DateTime.fromISO(slots[0].startsAtIso).setZone("Asia/Tokyo").toFormat("yyyy-MM-dd'T'HH:mm"));
      await row.getByRole("button", { name: copy.dashboard.lessonDetail.rescheduleSubmit, exact: true }).click();
      await expect(row.getByText(copy.dashboard.privateReschedule.rescheduledStatus, { exact: true })).toBeVisible();
      expect(savedBooking(bookingId)).toMatchObject({ status: "CONFIRMED", privateRescheduleStatus: "RESCHEDULED", startsAt: slots[0].startsAtIso });
      expect(savedBooking(bookingId).refunds).toEqual([]);
    } else {
      await row.getByRole("button", { name: action === "refund" ? copy.dashboard.privateReschedule.refundAction : copy.dashboard.privateReschedule.closeAction, exact: true }).click();
      await captureRelease(teacher, `${scenario.language}-teacher-confirm-${action}`);
      await teacher.getByRole("dialog").getByRole("button", { name: action === "refund" ? copy.dashboard.privateReschedule.confirmRefund : copy.dashboard.privateReschedule.confirmClose, exact: true }).click();
      await expect(row.getByText(action === "refund" ? copy.dashboard.privateReschedule.refundPendingStatus : copy.dashboard.privateReschedule.closedStatus, { exact: true })).toBeVisible();
      const booking = savedBooking(bookingId);
      expect(booking).toMatchObject({ status: "CANCELLED", privateRescheduleStatus: action === "refund" ? "REFUND_REQUESTED" : "CLOSED" });
      expect(booking.refunds).toHaveLength(action === "refund" ? 1 : 0);
      if (action === "refund") {
        expect((await teacher.request.post(`/api/bookings/${bookingId}/reschedule-request`, { data: { action: "refund" } })).status()).toBe(200);
        expect(savedBooking(bookingId).refunds).toHaveLength(1);
      }
      expect((await page.request.get(`/api/bookings/${bookingId}/reschedule`)).ok()).toBe(true);
      expect((await (await page.request.get(`/api/bookings/${bookingId}/reschedule`)).json()).slots).toEqual([]);
      expect((await page.request.post(`/api/bookings/${bookingId}/reschedule`, { data: { startsAt: slots[0].startsAtIso } })).status()).toBe(409);
    }
    await page.reload();
    const studentRow = page.locator(`[data-private-request="${bookingId}"]`);
    await expect(studentRow.getByRole("button", { name: copy.dashboard.privateReschedule.refundAction, exact: true })).toHaveCount(0);
    await expect(studentRow.getByRole("button", { name: copy.dashboard.privateReschedule.closeAction, exact: true })).toHaveCount(0);
    for (const participant of [page, teacher]) {
      const notices = await alerts(participant);
      const titles = notices.map(item => item.titleEn);
      expect(titles).toContain("Lesson reschedule requested");
      if (action === "close" && participant === page) expect(titles).not.toContain("Reschedule request closed");
      else expect(titles).toContain(action === "reschedule" ? "Lesson rescheduled" : action === "refund" ? "Lesson refund pending" : "Reschedule request closed");
      if (action === "refund" && participant === page) {
        const pending = notices.find(item => item.titleEn === "Lesson refund pending")!;
        expect(pending.bodyEn).not.toMatch(/5,000|5000|¥|￥/);
        expect(pending.bodyJa).not.toMatch(/5,000|5000|¥|￥/);
      }
    }
    if (action === "close") {
      await page.getByRole("button", { name: new RegExp(copy.common.notifications) }).click();
      await expect(page.getByTestId("notification-panel").getByText(scenario.locale === "ja" ? "再予約リクエストが終了しました" : "Reschedule request closed", { exact: true })).toHaveCount(0);
      await captureRelease(page, `${scenario.language}-student-closure-notifications-simplified`);
    }
    expect(errors).toEqual([]);
  } finally { await teacherContext.close(); }
});
