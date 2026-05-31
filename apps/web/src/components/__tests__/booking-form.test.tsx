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

  test("disables lesson selection until a time is chosen", async () => {
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
    expect(screen.getByText(en.booking.stepChooseLessonTitle)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: en.booking.confirm })).toBeDisabled();
  });
});
