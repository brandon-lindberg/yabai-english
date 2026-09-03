// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { DashboardScheduleCalendar } from "../dashboard-schedule-calendar";

vi.mock("@/hooks/use-is-mobile", () => ({
  useIsMobile: () => false,
}));

// Only the router: `Link` stays real, because a past lesson's href — locale
// prefix and all — is one of the things under test here.
vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const upcomingLesson = {
  id: "booking-1",
  startsAtIso: "2026-07-05T01:30:00.000Z",
  endsAtIso: "2026-07-05T02:10:00.000Z",
  title: "英会話 / Conversation",
  counterpartName: "Kana Minami Miura",
  isPast: false,
  status: "CONFIRMED" as const,
  durationMin: 40,
  priceYen: 4000,
  meetUrl: "https://meet.example/abc",
  groupSeats: null,
};

// Same week as the upcoming one, so a single month view holds both.
const pastLesson = {
  ...upcomingLesson,
  id: "booking-0",
  startsAtIso: "2026-07-02T01:30:00.000Z",
  endsAtIso: "2026-07-02T02:10:00.000Z",
  title: "発音 / Pronunciation",
  isPast: true,
  status: "COMPLETED" as const,
};

const groupLesson = {
  ...upcomingLesson,
  id: "booking-2",
  groupSeats: { capacity: 5, taken: 2 },
};

function renderCalendar(
  items: Array<Record<string, unknown>> = [upcomingLesson],
  viewer: "student" | "teacher" = "student",
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardScheduleCalendar
        timeZone="Asia/Tokyo"
        viewer={viewer}
        items={items as never}
      />
    </NextIntlClientProvider>,
  );
}

function openMonth() {
  fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));
}

describe("DashboardScheduleCalendar", () => {
  beforeEach(() => {
    // jsdom does not implement showModal, and it has to actually set `open` or
    // the dialog's contents stay out of the accessibility tree.
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("renders booked lesson times in the provided dashboard timezone", () => {
    renderCalendar();
    openMonth();

    expect(screen.getAllByText("10:30 AM").length).toBeGreaterThan(0);
    expect(screen.queryByText("07:30 PM")).toBeNull();
  });

  test("sends a past lesson to the completed history, not a dead hash", () => {
    // A finished lesson's record — notes, invoice — lives on the history page,
    // so it stays a link. Only a lesson still ahead opens the reservation.
    renderCalendar([upcomingLesson, pastLesson]);
    openMonth();

    const past = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.includes("booking-0"));

    // Locale-prefixed, so the hash survives next-intl's routing rather than
    // dropping the visitor on the default locale's history page.
    expect(past?.getAttribute("href")).toBe("/en/dashboard/schedule/completed#booking-booking-0");
  });

  test("marks a past lesson as spent rather than committed", () => {
    renderCalendar([upcomingLesson, pastLesson]);
    openMonth();

    const past = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.includes("booking-0"));
    const upcoming = screen
      .getAllByTestId("schedule-chip")
      .find((el) => el.getAttribute("data-booking-id") === "booking-1");

    // Solid ink means "you are committed here" — a finished lesson must not claim it.
    expect(upcoming?.className).toContain("bg-foreground");
    expect(past?.className).not.toContain("bg-foreground");
  });

  test("opens on the next lesson even when the past archive is longer", () => {
    // `items` leads with upcoming but carries every past lesson behind it;
    // anchoring on items[0] blindly would open years back.
    renderCalendar([upcomingLesson, pastLesson]);

    expect(screen.getByText(/Jul 5, 2026|Jun 28/)).toBeInTheDocument();
  });

  test("names the other person on the chip, in every view", () => {
    // The chip used to spend its second line on "Reserved" — the one word the
    // value ladder already says — and clipped the name it was there to carry.
    renderCalendar();
    expect(screen.getAllByText("Kana Minami Miura").length).toBeGreaterThan(0);

    openMonth();
    expect(screen.getAllByText("Kana Minami Miura").length).toBeGreaterThan(0);
  });

  test("a group class says how full it is instead of naming one person", () => {
    renderCalendar([groupLesson]);

    expect(screen.getAllByText("Group 2/5").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kana Minami Miura")).toBeNull();
  });

  test("still says a chip is a reservation, for anyone not reading the ink", () => {
    renderCalendar();

    expect(screen.getAllByTestId("schedule-chip")[0]).toHaveAccessibleName(
      new RegExp(en.dashboard.slotReserved),
    );
  });

  test("a student can open their own reservation", () => {
    renderCalendar();

    fireEvent.click(screen.getAllByTestId("schedule-chip")[0]!);

    expect(screen.getByText(en.booking.bookingDetailTitle)).toBeInTheDocument();
    expect(screen.getByText("英会話 / Conversation")).toBeInTheDocument();
    expect(screen.getByText(/40 min/)).toBeInTheDocument();
    expect(screen.getByText(/¥4,000/)).toBeInTheDocument();
  });

  test("the student's dialog names the teacher, not a student", () => {
    renderCalendar();

    fireEvent.click(screen.getAllByTestId("schedule-chip")[0]!);

    expect(screen.getByText(en.booking.bookingDetailWithTeacher)).toBeInTheDocument();
    expect(screen.queryByText(en.booking.bookingDetailWho)).toBeNull();
  });

  test("a student is never told who else is in their class", () => {
    // Seats are a count on this side of the marketplace. The teacher may see
    // their own students by name; one classmate may not see another.
    renderCalendar([groupLesson]);

    fireEvent.click(screen.getAllByTestId("schedule-chip")[0]!);

    // The chip says it and so does the dialog — a count, in both places.
    expect(screen.getAllByText("Group 2/5").length).toBe(2);
    expect(screen.queryByText(en.booking.bookingDetailClassmates)).toBeNull();
  });

  test("an unpaid reservation offers the student the way to finish paying", () => {
    renderCalendar([{ ...upcomingLesson, status: "PENDING_PAYMENT" }]);

    fireEvent.click(screen.getAllByTestId("schedule-chip")[0]!);

    expect(
      screen.getByRole("button", { name: en.booking.pendingReservationPay }),
    ).toBeInTheDocument();
  });

  test("a teacher is never offered to pay for somebody else's lesson", () => {
    renderCalendar([{ ...upcomingLesson, status: "PENDING_PAYMENT" }], "teacher");

    fireEvent.click(screen.getAllByTestId("schedule-chip")[0]!);

    expect(screen.queryByRole("button", { name: en.booking.pendingReservationPay })).toBeNull();
    expect(screen.getByText(en.booking.bookingDetailWho)).toBeInTheDocument();
  });
});
