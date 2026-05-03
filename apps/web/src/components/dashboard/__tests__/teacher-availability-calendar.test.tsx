// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherAvailabilityCalendar } from "../teacher-availability-calendar";

const sampleLevels = [
  { id: "lvl-int", code: "intermediate", labelEn: "Intermediate", labelJa: null },
];
const sampleTypes = [
  { id: "ty-conv", code: "conversation", labelEn: "Conversation", labelJa: null },
];

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderTeacherCalendar() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityCalendar
        initialSlots={[]}
        initialOccurrenceSkips={[]}
        defaultTimezone="UTC"
        classLevels={sampleLevels}
        classTypes={sampleTypes}
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

  test("the repeat toggle saves a weekly slot", async () => {
    renderTeacherCalendar();

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-16"]')!);
    const dialog = screen.getByRole("dialog", {
      name: en.dashboard.teacherAvailability.monthAddModalTitle,
    });
    fireEvent.click(within(dialog).getByRole("switch"));
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "true");

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
    });
    expect(body[0].startsOn).toBeUndefined();
  });
});
