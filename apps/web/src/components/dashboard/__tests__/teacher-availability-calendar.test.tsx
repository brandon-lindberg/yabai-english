// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import {
  TeacherAvailabilityCalendar,
  type InitialTeacherAvailabilitySlot,
  type TeacherCalendarBooking,
  type TeacherLessonOfferingOption,
} from "../teacher-availability-calendar";
import { availabilitySlotMatchesOffering } from "@/lib/availability-offering-match";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const sampleLevels = [
  { id: "lvl-int", code: "intermediate", labelEn: "Intermediate", labelJa: null },
];
const sampleTypes = [
  { id: "ty-conv", code: "conversation", labelEn: "Conversation", labelJa: null },
];
const sampleOfferings: TeacherLessonOfferingOption[] = [
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

const privateBooking: TeacherCalendarBooking = {
  id: "booking-1",
  startsAtIso: "2026-07-05T14:30:00.000Z",
  endsAtIso: "2026-07-05T15:10:00.000Z",
  studentLabel: "Kana Minami Miura",
  lessonLabel: "英会話 / Conversation",
  durationMin: 40,
  priceYen: 4000,
  status: "CONFIRMED",
  meetUrl: null,
};

const groupBooking: TeacherCalendarBooking = {
  ...privateBooking,
  id: "booking-group",
  groupSeats: { capacity: 5, taken: 2 },
  classmates: ["Kana Minami Miura", "Sho Tanaka"],
};

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderTeacherCalendar({
  initialSlots = [],
  bookings = [],
  defaultTimezone = "UTC",
  lessonOfferings = sampleOfferings,
}: {
  initialSlots?: InitialTeacherAvailabilitySlot[];
  bookings?: TeacherCalendarBooking[];
  defaultTimezone?: string;
  lessonOfferings?: TeacherLessonOfferingOption[];
} = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityCalendar
        initialSlots={initialSlots}
        initialOccurrenceSkips={[]}
        defaultTimezone={defaultTimezone}
        classLevels={sampleLevels}
        classTypes={sampleTypes}
        lessonOfferings={lessonOfferings}
        bookings={bookings}
      />
    </NextIntlClientProvider>,
  );
}

describe("TeacherAvailabilityCalendar", () => {
  beforeEach(() => {
    // The 48-hour booking lead time means the first addable day is 2026-04-17,
    // so these tests work on 2026-04-18.
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

    fireEvent.click(document.querySelector('[data-day-key="2026-04-18"]')!);

    expect(
      screen.getByRole("button", { name: en.dashboard.teacherAvailability.addForThisDay }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-18"]')!);

    expect(
      screen.getByRole("dialog", { name: en.dashboard.teacherAvailability.monthAddModalTitle }),
    ).toBeInTheDocument();
  });

  const oneOffSlot: InitialTeacherAvailabilitySlot = {
    id: "one-off-1",
    dayOfWeek: 6,
    startMin: 12 * 60,
    endMin: 13 * 60,
    timezone: "UTC",
    recurrence: "ONE_OFF",
    startsOn: "2026-04-18",
    endsOn: null,
    classLevelId: "lvl-int",
    classTypeId: "ty-conv",
    teacherLessonOfferingId: "offer-conv-60",
    assignedStudentId: null,
    classLevel: sampleLevels[0],
    classType: sampleTypes[0],
  };

  /** Confirming the add modal is the save, so this is how a change reaches the API. */
  async function addSlotThroughModal(dayKey = "2026-04-18") {
    fireEvent.click(document.querySelector(`[data-month-day-add="${dayKey}"]`)!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthAddModalConfirm,
        }),
      );
      await flushPromises();
    });
  }

  function savedPayload(callIndex = 0) {
    const [, init] = vi.mocked(fetch).mock.calls[callIndex];
    return JSON.parse(String(init?.body));
  }

  const weeklySlot: InitialTeacherAvailabilitySlot = {
    id: "weekly-1",
    dayOfWeek: 6,
    startMin: 12 * 60,
    endMin: 13 * 60,
    timezone: "UTC",
    recurrence: "WEEKLY",
    startsOn: "2026-04-04",
    endsOn: "2026-06-27",
    classLevelId: "lvl-int",
    classTypeId: "ty-conv",
    teacherLessonOfferingId: "offer-conv-60",
    assignedStudentId: null,
    classLevel: sampleLevels[0],
    classType: sampleTypes[0],
  };

  const WEEKLY_OCCURRENCE = "2026-04-18T12:00:00.000Z";

  function callsTo(url: string) {
    return vi.mocked(fetch).mock.calls.filter(([target]) => String(target) === url);
  }

  function openEditModalForWeeklyOccurrence() {
    renderTeacherCalendar({ initialSlots: [weeklySlot] });
    fireEvent.click(document.querySelector(`[data-starts-at="${WEEKLY_OCCURRENCE}"]`)!);
    return screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthEditModalTitle,
    });
  }

  async function editWeeklyStartTo(value: string) {
    const dialog = openEditModalForWeeklyOccurrence();
    fireEvent.change(within(dialog).getByDisplayValue("12:00"), { target: { value } });
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthEditModalConfirm,
        }),
      );
      await flushPromises();
    });
  }

  // Removing a weekly slot already asked one time or all of them; changing one
  // silently rewrote every week.
  test("updating a weekly slot asks whether to change one time or every time", async () => {
    await editWeeklyStartTo("14:00");

    expect(
      screen.getByRole("dialog", { name: en.dashboard.teacherAvailability.updateDialogTitle }),
    ).toBeInTheDocument();
    expect(callsTo("/api/teacher/availability")).toHaveLength(0);
  });

  test("changing this time only skips the occurrence and adds a one-off in its place", async () => {
    await editWeeklyStartTo("14:00");

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: en.dashboard.teacherAvailability.updateThisOccurrence,
        }),
      );
      await flushPromises();
    });

    const [, skipInit] = callsTo("/api/teacher/availability/occurrence-skips")[0];
    expect(JSON.parse(String(skipInit?.body))).toEqual({
      slotId: "weekly-1",
      startsAtIso: WEEKLY_OCCURRENCE,
    });

    const [, init] = callsTo("/api/teacher/availability")[0];
    const body = JSON.parse(String(init?.body));
    expect(body).toHaveLength(2);
    // The weekly rule is left exactly as it was.
    expect(body).toContainEqual(
      expect.objectContaining({ id: "weekly-1", recurrence: "WEEKLY", startMin: 12 * 60 }),
    );
    expect(body).toContainEqual(
      expect.objectContaining({
        recurrence: "ONE_OFF",
        startsOn: "2026-04-18",
        startMin: 14 * 60,
        endMin: 15 * 60,
      }),
    );
  });

  test("changing every time rewrites the weekly rule and skips nothing", async () => {
    await editWeeklyStartTo("14:00");

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: en.dashboard.teacherAvailability.updateAllSeries }),
      );
      await flushPromises();
    });

    expect(callsTo("/api/teacher/availability/occurrence-skips")).toHaveLength(0);
    const [, init] = callsTo("/api/teacher/availability")[0];
    const body = JSON.parse(String(init?.body));
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: "weekly-1",
      recurrence: "WEEKLY",
      startMin: 14 * 60,
      endMin: 15 * 60,
    });
  });

  // Skips are matched by timestamp, so a one-off that keeps the original start
  // time lands on the skipped instant and disappears with it.
  test("changing this time only keeps the slot visible when the time is unchanged", async () => {
    const dialog = openEditModalForWeeklyOccurrence();

    // Reserve this one week for a student; the time is deliberately untouched.
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthEditModalConfirm,
        }),
      );
      await flushPromises();
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: en.dashboard.teacherAvailability.updateThisOccurrence,
        }),
      );
      await flushPromises();
    });

    expect(document.querySelector(`[data-starts-at="${WEEKLY_OCCURRENCE}"]`)).toBeInTheDocument();
  });

  function openEditModalForOneOffSlot() {
    renderTeacherCalendar({ initialSlots: [oneOffSlot] });
    fireEvent.click(screen.getByRole("button", { name: /12:00/ }));
    return screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthEditModalTitle,
    });
  }

  // Editing used to happen in a panel below the calendar, far from the slot
  // that was clicked; adding already went through the modal.
  test("clicking an existing slot opens the edit modal prefilled with that slot", () => {
    const dialog = openEditModalForOneOffSlot();

    expect(within(dialog).getByDisplayValue("2026-04-18")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("12:00")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("13:00")).toBeInTheDocument();
  });

  test("the edit modal is the only place a slot can be edited or removed", () => {
    const dialog = openEditModalForOneOffSlot();

    // One Remove control, and it lives with the fields it acts on.
    const removeButtons = screen.getAllByRole("button", {
      name: en.dashboard.teacherAvailability.removeRule,
    });
    expect(removeButtons).toHaveLength(1);
    expect(dialog).toContainElement(removeButtons[0]);

    fireEvent.click(removeButtons[0]);
    expect(
      screen.getByRole("dialog", { name: en.dashboard.teacherAvailability.removeDialogTitle }),
    ).toBeInTheDocument();
  });

  test("confirming an edit updates the slot in place rather than adding one", async () => {
    const dialog = openEditModalForOneOffSlot();

    fireEvent.change(within(dialog).getByDisplayValue("12:00"), { target: { value: "14:00" } });
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthEditModalConfirm,
        }),
      );
      await flushPromises();
    });

    const body = savedPayload();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: "one-off-1", startMin: 14 * 60, endMin: 15 * 60 });
  });

  test("adding availability saves a one-off slot by default", async () => {
    renderTeacherCalendar();

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-18"]')!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "false");

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthAddModalConfirm,
        }),
      );
      await flushPromises();
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/teacher/availability",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(savedPayload()[0]).toMatchObject({
      recurrence: "ONE_OFF",
      startsOn: "2026-04-18",
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
          assignedStudentId: null,
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
    });

    await addSlotThroughModal();

    expect(savedPayload()[0]).toMatchObject({
      classLevelId: "lvl-int",
      classTypeId: "ty-conv",
      teacherLessonOfferingId: "offer-conv-60",
    });
  });

  // An offering with no class type cannot back a slot — the schema requires one
  // on every slot, so pairing with it builds a payload the server always
  // rejects, losing the teacher's whole save.
  test("skips an offering that cannot back a slot when backfilling a legacy slot", async () => {
    const offeringWithoutType: TeacherLessonOfferingOption = {
      id: "offer-no-type-60",
      durationMin: 60,
      rateYen: 3200,
      isGroup: false,
      groupSize: null,
      classLevelId: "lvl-int",
      classTypeId: null,
      classLevel: sampleLevels[0],
      classType: null,
    };
    renderTeacherCalendar({
      lessonOfferings: [offeringWithoutType, ...sampleOfferings],
      initialSlots: [
        {
          id: "legacy-slot-2",
          dayOfWeek: 4,
          startMin: 9 * 60,
          endMin: 10 * 60,
          timezone: "UTC",
          recurrence: "WEEKLY",
          startsOn: null,
          endsOn: null,
          // No offering carries this class type, so the picker falls through to
          // its duration-only fallback — where the unusable offering sits first.
          classLevelId: "lvl-int",
          classTypeId: "ty-biz",
          teacherLessonOfferingId: null,
          assignedStudentId: null,
          classLevel: sampleLevels[0],
          classType: null,
        },
      ],
    });

    await addSlotThroughModal();

    const saved = savedPayload()[0];
    const offerings = [offeringWithoutType, ...sampleOfferings];
    const paired = offerings.find((o) => o.id === saved.teacherLessonOfferingId);

    // The pairing the save route enforces, read from the same source it reads.
    expect(availabilitySlotMatchesOffering(saved, paired)).toBe(true);
  });

  // When nothing usable is left, the editor has to say so itself. Sending the
  // slot anyway trades a visible in-page block for a whole-payload 400.
  test("blocks saving when no offering can back a legacy slot", async () => {
    renderTeacherCalendar({
      lessonOfferings: [
        {
          id: "offer-no-type-60",
          durationMin: 60,
          rateYen: 3200,
          isGroup: false,
          groupSize: null,
          classLevelId: "lvl-int",
          classTypeId: null,
          classLevel: sampleLevels[0],
          classType: null,
        },
      ],
      initialSlots: [
        {
          id: "legacy-slot-3",
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
          assignedStudentId: null,
          classLevel: sampleLevels[0],
          classType: sampleTypes[0],
        },
      ],
    });

    await addSlotThroughModal();

    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(en.dashboard.teacherAvailability.invalidLessonMeta),
    ).toBeInTheDocument();
  });

  // Adding used to leave the change sitting in the page until a separate Save
  // was pressed — easy to leave unsaved, and the calendar looked identical
  // either way.
  test("there is no separate save step", async () => {
    renderTeacherCalendar();

    expect(
      screen.queryByRole("button", { name: en.dashboard.teacherAvailability.save }),
    ).not.toBeInTheDocument();

    await addSlotThroughModal();

    expect(fetch).toHaveBeenCalledWith(
      "/api/teacher/availability",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  test("removing a slot saves without a second step", async () => {
    const dialog = openEditModalForOneOffSlot();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: en.dashboard.teacherAvailability.removeRule,
      }),
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: en.dashboard.teacherAvailability.removeOneOff }),
      );
      await flushPromises();
    });

    expect(savedPayload()).toEqual([]);
  });

  test("the repeat toggle saves a weekly slot with From and Until bounds", async () => {
    renderTeacherCalendar();

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-18"]')!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    fireEvent.click(within(dialog).getByRole("switch"));
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByLabelText("From")).toHaveValue("2026-04-18");
    fireEvent.change(within(dialog).getByLabelText("Until"), {
      target: { value: "2026-06-16" },
    });

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: en.dashboard.teacherAvailability.monthAddModalConfirm,
        }),
      );
      await flushPromises();
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/teacher/availability",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(savedPayload()[0]).toMatchObject({
      recurrence: "WEEKLY",
      dayOfWeek: 6,
      startsOn: "2026-04-18",
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
          assignedStudentId: null,
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
          lessonLabel: "英会話 / Conversation",
          durationMin: 40,
          priceYen: 4000,
          status: "CONFIRMED" as const,
          meetUrl: null,
        },
      ],
    });

    const july5 = document.querySelector('[data-month-day-cell="2026-07-05"]');
    expect(july5).toBeTruthy();
    expect(within(july5 as HTMLElement).getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(within(july5 as HTMLElement).queryByTestId("month-slot-chip")).toBeNull();
    expect(july5!.textContent).toContain("10:30 AM");
    expect(within(july5 as HTMLElement).getByTestId("month-booking-chip")).toHaveAccessibleName(
      /Reserved/,
    );
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
          assignedStudentId: null,
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
          lessonLabel: "英会話 / Conversation",
          durationMin: 40,
          priceYen: 4000,
          status: "CONFIRMED" as const,
          meetUrl: null,
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
          assignedStudentId: null,
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
          lessonLabel: "英会話 / Conversation",
          durationMin: 40,
          priceYen: 4000,
          status: "CONFIRMED" as const,
          meetUrl: null,
        },
      ],
    });

    const june21 = document.querySelector('[data-month-day-cell="2026-06-21"]');
    expect(june21).toBeTruthy();
    expect(within(june21 as HTMLElement).getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(within(june21 as HTMLElement).queryByTestId("month-slot-chip")).toBeNull();
    expect(within(june21 as HTMLElement).getByTestId("month-booking-chip")).toHaveAccessibleName(
      /Reserved/,
    );
  });
});

describe("TeacherAvailabilityCalendar — reservations on the calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-07-01T12:00:00.000Z") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // A chip has room for a time and one line about it, and the line it spent on
  // "Reserved" was the one being clipped out of a 40-minute block.
  test("a private reservation names the student", () => {
    renderTeacherCalendar({ bookings: [privateBooking] });

    expect(screen.getAllByText("Kana Minami Miura").length).toBeGreaterThan(0);
  });

  // A group class has no single student to name.
  test("a group class says how full it is instead of naming one student", () => {
    renderTeacherCalendar({ bookings: [groupBooking] });

    expect(screen.getAllByText("Group 2/5").length).toBeGreaterThan(0);
  });

  test("a reservation can be opened", () => {
    renderTeacherCalendar({ bookings: [privateBooking] });

    fireEvent.click(screen.getAllByTestId("month-booking-chip")[0]!);

    expect(screen.getByText(en.booking.bookingDetailTitle)).toBeInTheDocument();
  });

  test("the dialog carries what the chip had no room for", () => {
    renderTeacherCalendar({ bookings: [privateBooking] });

    fireEvent.click(screen.getAllByTestId("month-booking-chip")[0]!);

    expect(screen.getByText("英会話 / Conversation")).toBeInTheDocument();
    expect(screen.getByText(/40 min/)).toBeInTheDocument();
    expect(screen.getByText(/¥4,000/)).toBeInTheDocument();
  });

  // The teacher may see who is in their own class; a student never does.
  test("names the class members for the teacher", () => {
    renderTeacherCalendar({ bookings: [groupBooking] });

    fireEvent.click(screen.getAllByTestId("month-booking-chip")[0]!);

    expect(screen.getByText("Kana Minami Miura, Sho Tanaka")).toBeInTheDocument();
  });
});
