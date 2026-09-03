// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { BookingForm } from "@/components/booking-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("BookingForm time-first flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Choosing a lesson is a decision about one particular time, so it does not
  // exist until a time is picked — rather than sitting on the page disabled.
  test("offers nothing to choose until a time is picked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve([
              {
                id: "lp-1",
                nameJa: "標準 60",
                nameEn: "Standard 60",
                durationMin: 60,
                tier: "STANDARD",
                teacherClassTypeId: "type-1",
              },
            ]),
        } as Response),
      ),
    );

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingForm
          teacherProfileId="teacher-1"
          // Pinned, or the calendar formats in the machine's zone and the
          // assertion below only holds where the developer happens to sit.
          viewerTimezone="Asia/Tokyo"
          presetSlots={[
            {
              startsAtIso: "2026-05-19T01:00:00.000Z",
              endsAtIso: "2026-05-19T02:00:00.000Z",
              label: "Mon 10:00",
              classTypeId: "type-1",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.booking.stepChooseTimeTitle)).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /10:00/ })).toBeEnabled(),
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: en.booking.confirm })).toBeNull();
    expect(screen.queryByText(en.booking.stepChooseLessonTitle)).toBeNull();
  });
});
