import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SchoolBookingRescheduleRequestStatus } from "@/generated/prisma/client";

const {
  authMock,
  findFirstMembershipMock,
  findUniqueBookingMock,
  findFirstSchoolBookingConflictMock,
  findFirstMarketplaceBookingMock,
  findManySlotsMock,
  teacherProfileFindUniqueMock,
  findFirstPendingMock,
  createRequestMock,
  findManyAdminsMock,
  createUserNotificationMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMembershipMock: vi.fn(),
  findUniqueBookingMock: vi.fn(),
  findFirstSchoolBookingConflictMock: vi.fn(),
  findFirstMarketplaceBookingMock: vi.fn(),
  findManySlotsMock: vi.fn(),
  teacherProfileFindUniqueMock: vi.fn(),
  findFirstPendingMock: vi.fn(),
  createRequestMock: vi.fn(),
  findManyAdminsMock: vi.fn(),
  createUserNotificationMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembership: {
      findFirst: findFirstMembershipMock,
      findMany: findManyAdminsMock,
    },
    schoolBooking: {
      findUnique: findUniqueBookingMock,
      findFirst: findFirstSchoolBookingConflictMock,
    },
    schoolScheduleSlot: { findMany: findManySlotsMock },
    teacherProfile: { findUnique: teacherProfileFindUniqueMock },
    booking: { findFirst: findFirstMarketplaceBookingMock },
    schoolBookingRescheduleRequest: {
      findFirst: findFirstPendingMock,
      create: createRequestMock,
    },
  },
}));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));

import { POST } from "@/app/api/org/[orgId]/schools/[schoolId]/classes/[bookingId]/reschedule-requests/route";

const orgId = "org-1";
const schoolId = "school-1";
const bookingId = "sb-1";
const now = new Date("2026-05-10T12:00:00.000Z");

function teacherMembership() {
  return {
    id: "tm-teacher",
    orgRole: "TEACHER" as const,
    status: "ACTIVE",
    schoolId,
    organizationId: orgId,
    userId: "teacher-user-1",
  };
}

function baseBooking() {
  return {
    id: bookingId,
    schoolId,
    scheduleSlotId: "slot-1",
    teacherMembershipId: "tm-teacher",
    startsAt: new Date("2026-05-24T01:00:00.000Z"),
    endsAt: new Date("2026-05-24T02:00:00.000Z"),
    school: { name: "Test School", organizationId: orgId },
    teacherMembership: {
      id: "tm-teacher",
      userId: "teacher-user-1",
      user: { id: "teacher-user-1", email: "t@example.com" },
    },
  };
}

describe("POST .../classes/[bookingId]/reschedule-requests", () => {
  const ctx = { params: Promise.resolve({ orgId, schoolId, bookingId }) };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    findFirstSchoolBookingConflictMock.mockResolvedValue(null);
    findFirstMarketplaceBookingMock.mockResolvedValue(null);
    findManySlotsMock.mockResolvedValue([]);
    teacherProfileFindUniqueMock.mockResolvedValue(null);
    findFirstPendingMock.mockResolvedValue(null);
    createRequestMock.mockResolvedValue({
      id: "req-1",
      proposedStartsAt: new Date("2026-05-24T01:30:00.000Z"),
      proposedEndsAt: new Date("2026-05-24T02:30:00.000Z"),
      status: SchoolBookingRescheduleRequestStatus.PENDING,
    });
    findManyAdminsMock.mockResolvedValue([{ userId: "admin-user" }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    findUniqueBookingMock.mockResolvedValue(baseBooking());

    const res = await POST(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(401);
    expect(createRequestMock).not.toHaveBeenCalled();
  });

  test("403 when caller is school admin (must use direct PATCH)", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue({
      id: "mem-admin",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "admin-user",
    });
    findUniqueBookingMock.mockResolvedValue(baseBooking());

    const res = await POST(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  test("201 teacher creates pending request and notifies admins", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1" } });
    findFirstMembershipMock.mockResolvedValue(teacherMembership());
    findUniqueBookingMock.mockResolvedValue(baseBooking());

    const res = await POST(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );

    expect(res.status).toBe(201);
    expect(createRequestMock).toHaveBeenCalled();
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-user",
        titleEn: expect.stringContaining("reschedule") as unknown as string,
      }),
    );
  });

  test("409 when a pending request already exists", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1" } });
    findFirstMembershipMock.mockResolvedValue(teacherMembership());
    findUniqueBookingMock.mockResolvedValue(baseBooking());
    findFirstPendingMock.mockResolvedValue({ id: "existing" });

    const res = await POST(
      new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      ctx,
    );
    expect(res.status).toBe(409);
    expect(createRequestMock).not.toHaveBeenCalled();
  });
});
