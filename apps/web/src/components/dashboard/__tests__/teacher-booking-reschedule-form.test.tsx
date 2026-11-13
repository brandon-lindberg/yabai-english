// @vitest-environment jsdom
import { expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherBookingRescheduleForm } from "../teacher-booking-reschedule-form";
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
test("server-rendered controls wait for hydration before accepting a date and submitting it", async () => {
  const view = <NextIntlClientProvider locale="en" messages={en}><TeacherBookingRescheduleForm bookingId="booking" initialStartsAtIso="2026-12-01T01:00:00Z" teacherTimezone="Asia/Tokyo" /></NextIntlClientProvider>;
  const container = document.createElement("div"); container.innerHTML = renderToString(view); document.body.append(container);
  expect(container.querySelector("input")).toBeDisabled();
  expect(container.querySelector("button")).toBeDisabled();
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ calendarUpdated: true })));
  vi.stubGlobal("fetch", fetch);
  try {
    render(view, { container, hydrate: true });
    const input = screen.getByLabelText(en.dashboard.lessonDetail.rescheduleLabel, { exact: false });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "2026-12-08T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: en.dashboard.lessonDetail.rescheduleSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ startsAt: "2026-12-08T01:00:00.000Z" });
  } finally { vi.unstubAllGlobals(); }
});
