// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { BookingForm } from "../booking-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const START = "2026-07-05T01:30:00.000Z";
const END = "2026-07-05T02:30:00.000Z";

type Props = React.ComponentProps<typeof BookingForm>;

function renderForm(
  presetSlots: Props["presetSlots"],
  bookedSlots?: Props["bookedSlots"],
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BookingForm
        teacherProfileId="t1"
        currentUserRole="STUDENT"
        viewerTimezone="Asia/Tokyo"
        presetSlots={presetSlots}
        bookedSlots={bookedSlots}
      />
    </NextIntlClientProvider>,
  );
}

function groupSlot(seats: { capacity: number; taken: number } | null) {
  return [
    {
      startsAtIso: START,
      endsAtIso: END,
      label: "Sun, Jul 5 10:30 - 11:30 (Asia/Tokyo)",
      groupKey: "slot-1",
      classTypeId: "ty-conv",
      seats,
    },
  ];
}

describe("BookingForm — group seats", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    );
  });

  test("an empty class offers every seat", () => {
    renderForm(groupSlot({ capacity: 5, taken: 0 }));

    expect(screen.getByText(/5 seats left/)).toBeInTheDocument();
  });

  // The behaviour this whole feature exists for: a class with people already in
  // it is still bookable, and says how much room is left.
  test("a partly filled class stays selectable and says what is left", () => {
    renderForm(groupSlot({ capacity: 5, taken: 2 }));

    const slot = screen.getByRole("button", { name: /3 seats left/ });
    expect(slot).toBeEnabled();
  });

  test("counts down to the last seat in the singular", () => {
    renderForm(groupSlot({ capacity: 5, taken: 4 }));

    expect(screen.getByText(/1 seat left/)).toBeInTheDocument();
    expect(screen.queryByText(/1 seats left/)).not.toBeInTheDocument();
  });

  test("a full class is shown as full and cannot be chosen", () => {
    renderForm(groupSlot({ capacity: 5, taken: 5 }));

    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Class full/);
    expect(screen.queryByRole("button", { name: /seats left/ })).not.toBeInTheDocument();
  });

  test("says nothing about seats for a private lesson", () => {
    renderForm(groupSlot(null));

    expect(screen.queryByText(/seats left/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /10:30/ })).toBeEnabled();
  });

  // The pre-group behaviour, unchanged: somebody else's private lesson.
  test("a taken private slot still reads as reserved", () => {
    renderForm(groupSlot(null), [{ startsAtIso: START, endsAtIso: END }]);

    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Reserved/);
  });

  test("the viewer's own unpaid hold is shown as theirs", () => {
    renderForm(groupSlot(null), [{ startsAtIso: START, endsAtIso: END, mine: true }]);

    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Your reservation/i);
  });

  // A private lesson the teacher is committed to beats any number of free
  // seats: they cannot be in two places at once.
  test("a private lesson at that time closes the class", () => {
    renderForm(groupSlot({ capacity: 5, taken: 1 }), [
      { startsAtIso: START, endsAtIso: END },
    ]);

    expect(screen.queryByText(/seats left/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Reserved/);
  });
});
