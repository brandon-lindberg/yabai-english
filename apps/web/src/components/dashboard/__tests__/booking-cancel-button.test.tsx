// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { BookingCancelButton } from "../booking-cancel-button";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }), Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/slot-selection-calendar", () => ({ SlotSelectionCalendar: ({ onSelectSlot }: { onSelectSlot: (value: string) => void }) =>
  <button type="button" onClick={() => onSelectSlot("2026-12-01T01:00:00.000Z")}>Available time</button> }));
const preview = {
  policy: { allowed: true, refundEligible: true, rescheduleOffered: false }, studentPrivate: true,
  reschedule: { allowed: true }, timeZone: "Asia/Tokyo", refundAmountYen: 5000,
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const show = () => render(<NextIntlClientProvider locale="en" messages={en}><BookingCancelButton bookingId="booking" /></NextIntlClientProvider>);
function mockRequests(options: { late?: boolean; slots?: boolean; boundary?: boolean } = {}) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/reschedule")) return reply(init?.method === "POST" ? { ok: true } : { slots: options.slots === false ? [] : [
      { startsAtIso: "2026-12-01T01:00:00.000Z", endsAtIso: "2026-12-01T02:00:00.000Z", label: "Available" },
    ] });
    if (init?.method === "POST") return options.boundary
      ? reply({ code: "REFUND_WINDOW_CHANGED", policy: { allowed: true, refundEligible: false, rescheduleOffered: true } }, 409)
      : options.late ? reply({ ok: true, booking: { privateRescheduleStatus: "PENDING" }, refund: null })
        : reply({ ok: true, refund: { status: "PENDING" } });
    return reply({ ...preview, ...(options.late ? { policy: { allowed: true, refundEligible: false, rescheduleOffered: true }, refundAmountYen: 0 } : {}) });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
});
afterEach(() => { vi.unstubAllGlobals(); });

test("Cancel booking opens the choices without cancelling or refunding", async () => {
  const fetch = mockRequests(); show();
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));
  await screen.findByRole("button", { name: "Cancel and refund" });
  await screen.findByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle });
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle }));
  expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back to options" }));
  await screen.findByRole("button", { name: "Cancel and refund" });
  fireEvent.click(screen.getByRole("button", { name: "Keep lesson" }));
  expect(refresh).not.toHaveBeenCalled();
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("confirmed cancellation uses the existing refund endpoint and shows a truthful pending result", async () => {
  const fetch = mockRequests(); show();
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel and refund" }));
  await screen.findByText("Your lesson is cancelled. Your refund is pending.");
  expect(fetch.mock.calls.filter(([url, init]) => url.endsWith("/cancel") && init?.method === "POST")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(refresh).toHaveBeenCalledOnce();
});

test("late cancellation requests a replacement before offering published times, without a student refund action", async () => {
  const fetch = mockRequests({ late: true }); show();
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel and request reschedule" }));
  fireEvent.click(await screen.findByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle }));
  expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Confirm cancellation" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Available time" }));
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.lessonDetail.rescheduleSubmit }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(fetch.mock.calls.filter(([url, init]) => url.endsWith("/cancel") && init?.method === "POST")).toHaveLength(1);
  expect(fetch.mock.calls.filter(([url, init]) => url.endsWith("/reschedule") && init?.method === "POST")).toHaveLength(1);
});

test("a late cancellation remains a pending request when the teacher has no published availability", async () => {
  const fetch = mockRequests({ late: true, slots: false }); show();
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel and request reschedule" }));
  await screen.findByText("There are no published replacement times available. Your reschedule request remains open. Contact your teacher to arrange a time.");
  expect(screen.queryByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle })).toBeNull();
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

test("the server can withdraw the refund choice at the time boundary", async () => {
  mockRequests({ boundary: true }); show();
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel and refund" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull());
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Keep lesson" })).toBeVisible();
});
