// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { PrivateRescheduleLesson } from "../private-reschedule-lesson";
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }), Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/booking/student-reschedule", () => ({ StudentReschedule: () => <button>Choose published time</button> }));
vi.mock("@/components/dashboard/teacher-booking-reschedule-form", () => ({ TeacherBookingRescheduleForm: () => <p>Agree a new time</p> }));
const props = { bookingId: "booking", lessonLabel: "Japanese lesson", counterpart: "Teacher", startsAtIso: "2026-11-01T01:00:00Z",
  timeZone: "Asia/Tokyo", rescheduleCount: 0, bookingStatus: "CANCELLED" as const, status: "PENDING" as const, paidAmountYen: 5000, refundStatus: null, hasCalendar: false };
const show = (viewer: "teacher" | "student") => render(<NextIntlClientProvider locale="en" messages={en}><PrivateRescheduleLesson {...props} viewer={viewer} /></NextIntlClientProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
});
afterEach(() => vi.unstubAllGlobals());
test("students see replacement times and the no-refund policy, without discretionary teacher actions", () => {
  show("student");
  expect(screen.getByRole("button", { name: "Choose published time" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Refund lesson" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Permanently cancel" })).toBeNull();
  expect(screen.getByText("Your original lesson is cancelled. No refund applies to this late cancellation. Arrange a new time with your teacher." )).toBeVisible();
});
test("a previously rescheduled lesson that is later cancelled does not appear confirmed", () => {
  render(<NextIntlClientProvider locale="en" messages={en}><PrivateRescheduleLesson {...props} status="RESCHEDULED" viewer="student" /></NextIntlClientProvider>);
  expect(screen.queryByText("Rescheduled", { exact: true })).toBeNull();
  expect(screen.getByText("Permanently cancelled", { exact: true })).toBeVisible();
});
test.each([["Refund lesson", "Issue full refund", "refund"], ["Permanently cancel", "Close reschedule request", "close"]])("teacher action %s requires explicit confirmation", async (trigger, confirm, action) => {
  show("teacher"); fireEvent.click(screen.getByRole("button", { name: trigger }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: confirm }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/bookings/booking/reschedule-request", expect.objectContaining({ method: "POST", body: JSON.stringify({ action }) })));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});
