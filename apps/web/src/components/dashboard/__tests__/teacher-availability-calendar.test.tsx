// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import {
  TeacherAvailabilityCalendar,
  type InitialTeacherAvailabilitySlot,
  type TeacherCalendarBooking,
} from "../teacher-availability-calendar";

const sampleLevels = [
  { id: "lvl-int", code: "intermediate", labelEn: "Intermediate", labelJa: null },
];
const sampleTypes = [
  { id: "ty-conv", code: "conversation", labelEn: "Conversation", labelJa: null },
];
const sampleOfferings = [
  {
    id: "offer-conv-60",
    durationMin: 60,
    rateYen: 3500,
    isGroup: false,
    groupSize: null,
    classLevelId: "lvl-int",
    classTypeId: "ty-conv",
    classLevel: sampleLevels[0],
    classType: sampleTypes[0],
  },
];

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderTeacherCalendar({
  initialSlots = [],
  bookings = [],
  defaultTimezone = "UTC",
}: {
  initialSlots?: InitialTeacherAvailabilitySlot[];
  bookings?: TeacherCalendarBooking[];
  defaultTimezone?: string;
} = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityCalendar
        initialSlots={initialSlots}
        initialOccurrenceSkips={[]}
        defaultTimezone={defaultTimezone}
        classLevels={sampleLevels}
        classTypes={sampleTypes}
        lessonOfferings={sampleOfferings}
        bookings={bookings}
      />
    </NextIntlClientProvider>,
  );
}

describe("TeacherAvailabilityCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-04-15T12:00:00.000Z") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("defaults to month: tap the day opens day view for edit/remove; Add chip opens the dialog", () => {
    renderTeacherCalendar();

    expect(screen.getByTestId("google-month-grid")).toBeInTheDocument();

    fireEvent.click(document.querySelector('[data-day-key="2026-04-16"]')!);

    expect(
      screen.getByRole("button", { name: en.dashboard.teacherAvailability.addForThisDay }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-16"]')!);

    expect(
      screen.getByRole("dialog", { name: en.dashboard.teacherAvailability.monthAddModalTitle }),
    ).toBeInTheDocument();
  });

  test("adding availability saves a one-off slot by default", async () => {
    renderTeacherCalendar();

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-16"]')!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "false");

    fireEvent.click(within(dialog).getByRole("button", { name: en.dashboard.teacherAvailability.monthAddModalConfirm }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en.dashboard.teacherAvailability.save }));
      await flushPromises();
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/teacher/availability",
      expect.objectContaining({ method: "PATCH" }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body[0]).toMatchObject({
      recurrence: "ONE_OFF",
      startsOn: "2026-04-16",
    });
  });

  test("backfills legacy slots with a matching class offer so availability can be saved", async () => {
    renderTeacherCalendar({
      initialSlots: [
        {
          id: "legacy-slot-1",
          dayOfWeek: 4,
          startMin: 9 * 60,
          endMin: 10 * 60,
          timezone: "UTC",
          recurrence: "WEEKLY",
          startsOn: null,
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: null,
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
    });

    const saveButton = screen.getByRole("button", {
      name: en.dashboard.teacherAvailability.save,
    });
    expect(saveButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(saveButton);
      await flushPromises();
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body[0]).toMatchObject({
      classLevelId: "lvl-int",
      classTypeId: "ty-conv",
      teacherLessonOfferingId: "offer-conv-60",
    });
  });

  test("the repeat toggle saves a weekly slot with From and Until bounds", async () => {
    renderTeacherCalendar();

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-16"]')!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    fireEvent.click(within(dialog).getByRole("switch"));
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByLabelText("From")).toHaveValue("2026-04-16");
    fireEvent.change(within(dialog).getByLabelText("Until"), {
      target: { value: "2026-06-16" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: en.dashboard.teacherAvailability.monthAddModalConfirm }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en.dashboard.teacherAvailability.save }));
      await flushPromises();
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/teacher/availability",
      expect.objectContaining({ method: "PATCH" }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body[0]).toMatchObject({
      recurrence: "WEEKLY",
      dayOfWeek: 4,
      startsOn: "2026-04-16",
      endsOn: "2026-06-16",
    });
  });

  test("shows booked slots in the teacher timezone and hides matching availability", () => {
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    renderTeacherCalendar({
      defaultTimezone: "America/New_York",
      initialSlots: [
        {
          id: "weekly-ny-1030",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "America/New_York",
          recurrence: "WEEKLY",
          startsOn: "2026-06-21",
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-conv-60",
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
      bookings: [
        {
          id: "booking-1",
          startsAtIso: "2026-07-05T14:30:00.000Z",
          endsAtIso: "2026-07-05T15:10:00.000Z",
          studentLabel: "Kana Miura",
        },
      ],
    });

    const july5 = document.querySelector('[data-month-day-cell="2026-07-05"]');
    expect(july5).toBeTruthy();
    expect(within(july5 as HTMLElement).getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(within(july5 as HTMLElement).queryByTestId("month-slot-chip")).toBeNull();
    expect(july5!.textContent).toContain("10:30 AM");
    expect(july5!.textContent).toContain("Reserved");
  });

  test("hides legacy timezone-shifted duplicate availability when the intended slot is booked", () => {
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    renderTeacherCalendar({
      defaultTimezone: "Asia/Tokyo",
      initialSlots: [
        {
          id: "legacy-shifted-weekly",
          dayOfWeek: 0,
          startMin: 1 * 60 + 30,
          endMin: 2 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: "2026-06-21",
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-conv-60",
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
      bookings: [
        {
          id: "booking-shifted",
          startsAtIso: "2026-07-05T01:30:00.000Z",
          endsAtIso: "2026-07-05T02:30:00.000Z",
          studentLabel: "Kana Miura",
        },
      ],
    });

    const july5 = document.querySelector('[data-month-day-cell="2026-07-05"]');
    expect(july5).toBeTruthy();
    expect(within(july5 as HTMLElement).getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(within(july5 as HTMLElement).queryByTestId("month-slot-chip")).toBeNull();
    expect(july5!.textContent).toContain("10:30 AM");
  });

  test("renders same-day reservations even after they are no longer upcoming", () => {
    vi.setSystemTime(new Date("2026-06-21T06:00:00.000Z"));
    renderTeacherCalendar({
      defaultTimezone: "Asia/Tokyo",
      initialSlots: [
        {
          id: "tokyo-weekly-1030",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: "2026-06-21",
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-conv-60",
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
      bookings: [
        {
          id: "booking-today",
          startsAtIso: "2026-06-21T01:30:00.000Z",
          endsAtIso: "2026-06-21T02:10:00.000Z",
          studentLabel: "Kana Miura",
        },
      ],
    });

    const june21 = document.querySelector('[data-month-day-cell="2026-06-21"]');
    expect(june21).toBeTruthy();
    expect(within(june21 as HTMLElement).getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(within(june21 as HTMLElement).queryByTestId("month-slot-chip")).toBeNull();
    expect(june21!.textContent).toContain("Reserved");
  });
});
