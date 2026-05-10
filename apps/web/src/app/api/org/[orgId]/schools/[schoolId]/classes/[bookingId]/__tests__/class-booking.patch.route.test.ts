import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  findFirstMembershipMock,
  findUniqueBookingMock,
  findFirstSchoolBookingConflictMock,
  findFirstMarketplaceBookingMock,
  updateBookingMock,
  findManySlotsMock,
  teacherProfileFindUniqueMock,
  patchMeetLessonEventMock,
  createUserNotificationMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMembershipMock: vi.fn(),
  findUniqueBookingMock: vi.fn(),
  findFirstSchoolBookingConflictMock: vi.fn(),
  findFirstMarketplaceBookingMock: vi.fn(),
  updateBookingMock: vi.fn(),
  findManySlotsMock: vi.fn(),
  teacherProfileFindUniqueMock: vi.fn(),
  patchMeetLessonEventMock: vi.fn(),
  createUserNotificationMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembership: { findFirst: findFirstMembershipMock, findMany: vi.fn() },
    schoolBooking: {
      findUnique: findUniqueBookingMock,
      findFirst: findFirstSchoolBookingConflictMock,
      update: updateBookingMock,
    },
    schoolScheduleSlot: { findMany: findManySlotsMock },
    teacherProfile: { findUnique: teacherProfileFindUniqueMock },
    booking: { findFirst: findFirstMarketplaceBookingMock },
  },
}));
vi.mock("@/lib/google-calendar", () => ({
  patchMeetLessonEvent: patchMeetLessonEventMock,
}));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { PATCH } from "@/app/api/org/[orgId]/schools/[schoolId]/classes/[bookingId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const bookingId = "sb-1";
const now = new Date("2026-05-10T12:00:00.000Z");

function adminMembership() {
  return {
    id: "mem-admin",
    orgRole: "SCHOOL_ADMIN" as const,
    status: "ACTIVE",
    schoolId,
    organizationId: orgId,
    userId: "admin-user",
  };
}

function baseSchoolBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: bookingId,
    schoolId,
    scheduleSlotId: "slot-1",
    teacherMembershipId: "tm-teacher",
    startsAt: new Date("2026-05-24T01:00:00.000Z"),
    endsAt: new Date("2026-05-24T02:00:00.000Z"),
    googleEventId: "gcal-evt-1",
    meetUrl: "https://meet.google.com/xxx",
    school: { name: "Test School" },
    teacherMembership: {
      id: "tm-teacher",
      userId: "teacher-user-1",
      user: { id: "teacher-user-1", email: "t@example.com" },
    },
    attendees: [
      {
        studentMembership: {
          userId: "student-user-1",
          user: { id: "student-user-1", email: "s@example.com" },
        },
      },
    ],
    ...overrides,
  };
}

describe("PATCH /api/org/.../schools/.../classes/[bookingId]", () => {
  const ctx = {
    params: Promise.resolve({ orgId, schoolId, bookingId }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    patchMeetLessonEventMock.mockResolvedValue(true);
    findManySlotsMock.mockResolvedValue([]);
    findFirstMarketplaceBookingMock.mockResolvedValue(null);
    teacherProfileFindUniqueMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(401);
    expect(updateBookingMock).not.toHaveBeenCalled();
  });

  test("403 when caller cannot manage this class", async () => {
    authMock.mockResolvedValue({ user: { id: "student-user-1" } });
    findFirstMembershipMock.mockResolvedValue({
      id: "mem-stu",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "student-user-1",
    });
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  test("404 when booking belongs to another school", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findUniqueBookingMock.mockResolvedValue(
      baseSchoolBooking({ schoolId: "other-school" }),
    );

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  test("200 school admin reschedules, patches calendar, notifies attendees", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());
    findFirstSchoolBookingConflictMock.mockResolvedValue(null);
    const newStart = new Date("2026-05-24T01:30:00.000Z");
    const newEnd = new Date("2026-05-24T02:30:00.000Z");
    updateBookingMock.mockResolvedValue({
      id: bookingId,
      startsAt: newStart,
      endsAt: newEnd,
      googleEventId: "gcal-evt-1",
    });

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(updateBookingMock).toHaveBeenCalled();
    expect(patchMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "teacher-user-1",
        eventId: "gcal-evt-1",
        start: newStart,
        end: newEnd,
      }),
    );
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-user-1",
        titleEn: expect.stringContaining("class") as unknown as string,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  test("403 when assigned teacher uses direct PATCH (must submit a request)", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1" } });
    findFirstMembershipMock.mockResolvedValue({
      id: "tm-teacher",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "teacher-user-1",
    });
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(updateBookingMock).not.toHaveBeenCalled();
    expect(createUserNotificationMock).not.toHaveBeenCalled();
  });

  test("200 unchanged time skips update and does not notify", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:00:00.000Z" }),
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(updateBookingMock).not.toHaveBeenCalled();
    expect(createUserNotificationMock).not.toHaveBeenCalled();
  });

  test("409 when overlapping another school booking for same teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findUniqueBookingMock.mockResolvedValue(baseSchoolBooking());
    findFirstSchoolBookingConflictMock.mockResolvedValue({ id: "other-sb" });

    const res = await PATCH(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(409);
    expect(updateBookingMock).not.toHaveBeenCalled();
  });
});
