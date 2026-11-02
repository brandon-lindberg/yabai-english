// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { StudentReschedule } from "../student-reschedule";
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/slot-selection-calendar", () => ({ SlotSelectionCalendar: ({ slots, onSelectSlot }: { slots: { startsAtIso: string }[]; onSelectSlot: (value: string) => void }) => <button onClick={() => onSelectSlot(slots[0].startsAtIso)}>Available slot</button> }));
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const show = () => render(<NextIntlClientProvider locale="en" messages={en}><StudentReschedule bookingId="booking" timeZone="Asia/Tokyo" /></NextIntlClientProvider>);
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

test.each([[], undefined])("offers no reschedule option without confirmed available times (%j)", async slots => {
  const fetchMock = vi.fn().mockResolvedValue(reply({ slots })); vi.stubGlobal("fetch", fetchMock);
  show(); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle })).toBeNull();
});
test("an available time enables the existing move endpoint without charging or creating a booking", async () => {
  const at = "2026-12-01T02:00:00.000Z";
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ slots: [{ startsAtIso: at, endsAtIso: "2026-12-01T03:00:00.000Z", label: "Available" }] })).mockResolvedValueOnce(reply({ ok: true }));
  vi.stubGlobal("fetch", fetchMock); show();
  fireEvent.click(await screen.findByRole("button", { name: en.dashboard.lessonDetail.rescheduleTitle }));
  fireEvent.click(screen.getByRole("button", { name: "Available slot" }));
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.lessonDetail.rescheduleSubmit }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(fetchMock.mock.calls[1][0]).toBe("/api/bookings/booking/reschedule");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ startsAt: at });
  expect(fetchMock.mock.calls.some(([url]) => url === "/api/bookings")).toBe(false);
});
