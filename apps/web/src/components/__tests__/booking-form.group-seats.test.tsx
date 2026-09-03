// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("an empty class offers every seat", () => {
    renderForm(groupSlot({ capacity: 5, taken: 0 }));

    expect(screen.getByText(/5 left/)).toBeInTheDocument();
  });

  // The behaviour this whole feature exists for: a class with people already in
  // it is still bookable, and says how much room is left.
  test("a partly filled class stays selectable and says what is left", () => {
    renderForm(groupSlot({ capacity: 5, taken: 2 }));

    const slot = screen.getByRole("button", { name: /3 left/ });
    expect(slot).toBeEnabled();
  });

  // The badge has to survive a week-view column, so it counts tersely.
  test("counts down to the last seat", () => {
    renderForm(groupSlot({ capacity: 5, taken: 4 }));

    expect(screen.getByText(/1 left/)).toBeInTheDocument();
  });

  test("a full class is shown as full and cannot be chosen", () => {
    renderForm(groupSlot({ capacity: 5, taken: 5 }));

    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Full/);
    expect(screen.queryByRole("button", { name: /left/ })).not.toBeInTheDocument();
  });

  test("says nothing about seats for a private lesson", () => {
    renderForm(groupSlot(null));

    expect(screen.queryByText(/ left/)).not.toBeInTheDocument();
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

    expect(screen.queryByText(/ left/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Reserved/);
  });

  // Which kind of lesson a time is was previously only visible on group slots,
  // as a seat count — so a private lesson was identified by the absence of
  // something, which is not something anyone notices.
  test("says a private lesson is private", () => {
    renderForm(groupSlot(null));

    expect(screen.getByRole("button", { name: /Private/ })).toBeInTheDocument();
  });

  test("says a group class is a group, and how much room is left", () => {
    renderForm(groupSlot({ capacity: 5, taken: 2 }));

    expect(screen.getByRole("button", { name: /Group · 3 left/ })).toBeInTheDocument();
  });

  test("says a full class is a group that is full", () => {
    renderForm(groupSlot({ capacity: 5, taken: 5 }));

    expect(screen.getAllByTestId("slot-reserved-week")[0]!).toHaveTextContent(/Full/);
  });
});

describe("BookingForm — picking a time opens the booking dialog", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("shows no booking controls before a time is picked", () => {
    renderForm(groupSlot(null));

    expect(screen.queryByRole("button", { name: en.booking.confirm })).toBeNull();
    expect(screen.queryByText(en.booking.stepChooseLessonTitle)).toBeNull();
  });

  test("opens the dialog on the time that was picked", async () => {
    renderForm(groupSlot(null));

    fireEvent.click(screen.getByRole("button", { name: /Private/ }));

    expect(await screen.findByText(en.booking.bookingModalTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.booking.confirm })).toBeInTheDocument();
  });

  test("closing the dialog puts the student back on the calendar", async () => {
    renderForm(groupSlot(null));

    fireEvent.click(screen.getByRole("button", { name: /Private/ }));
    await screen.findByText(en.booking.bookingModalTitle);
    fireEvent.click(screen.getByRole("button", { name: en.booking.bookingModalCancel }));

    expect(screen.queryByText(en.booking.bookingModalTitle)).toBeNull();
    expect(screen.getByRole("button", { name: /Private/ })).toBeInTheDocument();
  });
});
