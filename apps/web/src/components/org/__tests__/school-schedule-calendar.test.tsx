// @vitest-environment jsdom

import {
  describe,
  expect,
  test,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { SchoolScheduleCalendar } from "../school-schedule-calendar";

const orgId = "org-1";
const schoolId = "school-1";

const slotsResponse = {
  slots: [
    {
      id: "slot-1",
      dayOfWeek: 1,
      startMin: 540,
      endMin: 600,
      durationMin: 60,
      timezone: "UTC",
      capacity: 5,
      lessonLevel: "beginner",
      lessonType: "conversation",
      labelJa: null,
      labelEn: null,
      assignedTeacherMembershipId: null,
      classLevelId: "lvl-1",
      classTypeId: "type-1",
      classLevel: { id: "lvl-1", code: "year-7", label: "Year 7", labelJa: null, labelEn: "Year 7" },
      classType: { id: "type-1", code: "conv", label: "Conversation", labelJa: null, labelEn: "Conversation" },
      assignedTeacher: null,
      _count: { enrollments: 2 },
    },
  ],
  viewerEnrolledSlotIds: [],
};

const classLevelsResponse = {
  classLevels: [
    { id: "lvl-1", code: "year-7", label: "Year 7", labelJa: null, labelEn: "Year 7", sortOrder: 0, active: true },
    { id: "lvl-2", code: "year-8", label: "Year 8", labelJa: null, labelEn: "Year 8", sortOrder: 1, active: true },
  ],
};

const classTypesResponse = {
  classTypes: [
    { id: "type-1", code: "conv", label: "Conversation", labelJa: null, labelEn: "Conversation", sortOrder: 0, active: true },
    { id: "type-2", code: "gram", label: "Grammar", labelJa: null, labelEn: "Grammar", sortOrder: 1, active: true },
  ],
};

function setupFetchMock() {
  const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url.toString();
    const method = init?.method ?? "GET";
    if (u.endsWith("/schedule") && method === "GET") {
      return new Response(JSON.stringify(slotsResponse), { status: 200 });
    }
    if (u.endsWith("/class-levels") && method === "GET") {
      return new Response(JSON.stringify(classLevelsResponse), { status: 200 });
    }
    if (u.endsWith("/class-types") && method === "GET") {
      return new Response(JSON.stringify(classTypesResponse), { status: 200 });
    }
    if (u.endsWith("/schedule") && method === "POST") {
      const body = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          slot: {
            id: "slot-2",
            ...body,
            timezone: "UTC",
            classLevel: classLevelsResponse.classLevels.find((l) => l.id === body.classLevelId) ?? null,
            classType: classTypesResponse.classTypes.find((t) => t.id === body.classTypeId) ?? null,
            assignedTeacher: null,
            _count: { enrollments: 0 },
          },
        }),
        { status: 201 },
      );
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

function renderCalendar() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SchoolScheduleCalendar orgId={orgId} schoolId={schoolId} />
    </NextIntlClientProvider>,
  );
}

describe("SchoolScheduleCalendar", () => {
  let fetchSpy: ReturnType<typeof setupFetchMock>;

  beforeEach(() => {
    fetchSpy = setupFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("fetches schedule, class-levels, and class-types on mount", async () => {
    renderCalendar();
    await waitFor(() => {
      const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain(`/api/org/${orgId}/schools/${schoolId}/schedule`);
      expect(urls).toContain(`/api/org/${orgId}/schools/${schoolId}/class-levels`);
      expect(urls).toContain(`/api/org/${orgId}/schools/${schoolId}/class-types`);
    });
  });

  test("renders calendar view-mode controls (week/day/month)", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: en.dashboard.calendarWeek }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: en.dashboard.calendarDay }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: en.dashboard.calendarMonth }),
      ).toBeInTheDocument();
    });
  });

  test("class-level dropdown renders labelEn values (en locale)", async () => {
    const distinctLevels = {
      classLevels: [
        {
          id: "lvl-a",
          code: "year-1",
          labelEn: "Year 1",
          labelJa: null,
          sortOrder: 0,
          active: true,
        },
        {
          id: "lvl-b",
          code: "beginner",
          labelEn: "Beginner",
          labelJa: null,
          sortOrder: 1,
          active: true,
        },
      ],
    };
    vi.unstubAllGlobals();
    const fetchSpy2 = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      const method = init?.method ?? "GET";
      if (u.endsWith("/schedule") && method === "GET") {
        return new Response(JSON.stringify({ slots: [], viewerEnrolledSlotIds: [] }), { status: 200 });
      }
      if (u.endsWith("/class-levels") && method === "GET") {
        return new Response(JSON.stringify(distinctLevels), { status: 200 });
      }
      if (u.endsWith("/class-types") && method === "GET") {
        return new Response(
          JSON.stringify({
            classTypes: [
              {
                id: "ty-1",
                code: "conv",
                labelEn: "Conversation",
                labelJa: null,
                sortOrder: 0,
                active: true,
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy2);

    renderCalendar();

    await waitFor(() =>
      screen.getByRole("button", {
        name: en.org.school.schedulePage.addSlot,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.addSlot }),
    );

    const levelSelect = (await screen.findByLabelText(
      en.org.school.schedulePage.classLevel,
    )) as HTMLSelectElement;
    const optionTexts = Array.from(levelSelect.options).map((o) => o.text);
    expect(optionTexts).toContain("Year 1");
    expect(optionTexts).toContain("Beginner");
  });

  test("opens add modal and POSTs with classLevelId/classTypeId (FKs, not strings)", async () => {
    renderCalendar();

    await waitFor(() =>
      screen.getByRole("button", {
        name: en.org.school.schedulePage.addSlot,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.addSlot }),
    );

    const dayInput = screen.getByLabelText(
      en.org.school.schedulePage.dayOfWeek,
    ) as HTMLSelectElement;
    fireEvent.change(dayInput, { target: { value: "2" } });

    const levelSelect = screen.getByLabelText(
      en.org.school.schedulePage.classLevel,
    ) as HTMLSelectElement;
    fireEvent.change(levelSelect, { target: { value: "lvl-2" } });

    const typeSelect = screen.getByLabelText(
      en.org.school.schedulePage.classType,
    ) as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "type-2" } });

    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.create }),
    );

    await waitFor(() => {
      const post = fetchSpy.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = JSON.parse((post![1] as RequestInit).body as string);
      expect(body.classLevelId).toBe("lvl-2");
      expect(body.classTypeId).toBe("type-2");
      expect(body.dayOfWeek).toBe(2);
    });
  });

  test("create form shows a recurrence picker with Weekly / Daily / One-off", async () => {
    renderCalendar();
    await waitFor(() =>
      screen.getByRole("button", {
        name: en.org.school.schedulePage.addSlot,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.addSlot }),
    );

    const recurrence = (await screen.findByLabelText(
      en.org.school.schedulePage.recurrence,
    )) as HTMLSelectElement;
    const optionTexts = Array.from(recurrence.options).map((o) => o.text);
    expect(optionTexts).toContain(en.org.school.schedulePage.recurrenceWeekly);
    expect(optionTexts).toContain(en.org.school.schedulePage.recurrenceDaily);
    expect(optionTexts).toContain(en.org.school.schedulePage.recurrenceOneOff);
  });

  test("WEEKLY POST sends daysOfWeek when multiple days selected", async () => {
    renderCalendar();
    await waitFor(() =>
      screen.getByRole("button", {
        name: en.org.school.schedulePage.addSlot,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.addSlot }),
    );

    // Class level/type are required: pick them first.
    fireEvent.change(
      await screen.findByLabelText(en.org.school.schedulePage.classLevel),
      { target: { value: "lvl-1" } },
    );
    fireEvent.change(
      await screen.findByLabelText(en.org.school.schedulePage.classType),
      { target: { value: "type-1" } },
    );

    // Default recurrence is WEEKLY. Tick Wednesday and Friday in addition to default Monday.
    const wed = (await screen.findByLabelText(
      en.org.school.schedulePage.days[3],
    )) as HTMLInputElement;
    const fri = (await screen.findByLabelText(
      en.org.school.schedulePage.days[5],
    )) as HTMLInputElement;
    fireEvent.click(wed);
    fireEvent.click(fri);

    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.create }),
    );

    await waitFor(() => {
      const post = fetchSpy.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = JSON.parse((post![1] as RequestInit).body as string);
      expect(body.recurrence).toBe("WEEKLY");
      expect([...body.daysOfWeek].sort()).toEqual([1, 3, 5]);
    });
  });

  test("ONE_OFF requires a date and sends startsOn", async () => {
    renderCalendar();
    await waitFor(() =>
      screen.getByRole("button", {
        name: en.org.school.schedulePage.addSlot,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.addSlot }),
    );

    fireEvent.change(
      await screen.findByLabelText(en.org.school.schedulePage.classLevel),
      { target: { value: "lvl-1" } },
    );
    fireEvent.change(
      await screen.findByLabelText(en.org.school.schedulePage.classType),
      { target: { value: "type-1" } },
    );

    const recurrence = (await screen.findByLabelText(
      en.org.school.schedulePage.recurrence,
    )) as HTMLSelectElement;
    fireEvent.change(recurrence, { target: { value: "ONE_OFF" } });

    const date = (await screen.findByLabelText(
      en.org.school.schedulePage.oneOffDate,
    )) as HTMLInputElement;
    fireEvent.change(date, { target: { value: "2026-05-15" } });

    fireEvent.click(
      screen.getByRole("button", { name: en.org.school.schedulePage.create }),
    );

    await waitFor(() => {
      const post = fetchSpy.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = JSON.parse((post![1] as RequestInit).body as string);
      expect(body.recurrence).toBe("ONE_OFF");
      expect(body.startsOn).toBe("2026-05-15");
    });
  });
});
