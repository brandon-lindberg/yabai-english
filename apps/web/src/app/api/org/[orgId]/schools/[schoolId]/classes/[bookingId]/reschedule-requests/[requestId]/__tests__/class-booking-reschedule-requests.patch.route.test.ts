import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SchoolBookingRescheduleRequestStatus } from "@/generated/prisma/client";

const {
  authMock,
  findFirstMembershipMock,
  findFirstRequestMock,
  updateRequestMock,
  getConflictMock,
  applyMock,
  createUserNotificationMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMembershipMock: vi.fn(),
  findFirstRequestMock: vi.fn(),
  updateRequestMock: vi.fn(),
  getConflictMock: vi.fn(),
  applyMock: vi.fn(),
  createUserNotificationMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembership: { findFirst: findFirstMembershipMock },
    schoolBookingRescheduleRequest: {
      findFirst: findFirstRequestMock,
      update: updateRequestMock,
    },
  },
}));
vi.mock("@/lib/school-booking-reschedule-apply", () => ({
  getSchoolBookingRescheduleConflictError: getConflictMock,
  applySchoolBookingReschedule: applyMock,
}));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));

import { PATCH } from "@/app/api/org/[orgId]/schools/[schoolId]/classes/[bookingId]/reschedule-requests/[requestId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const bookingId = "sb-1";
const requestId = "req-1";
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

function pendingRequest() {
  const proposedStartsAt = new Date("2026-05-24T01:30:00.000Z");
  const proposedEndsAt = new Date("2026-05-24T02:30:00.000Z");
  return {
    id: requestId,
    status: SchoolBookingRescheduleRequestStatus.PENDING,
    proposedStartsAt,
    proposedEndsAt,
    requesterMembership: { userId: "teacher-user-1" },
    schoolBooking: {
      id: bookingId,
      schoolId,
      scheduleSlotId: "slot-1",
      teacherMembershipId: "tm-teacher",
      startsAt: new Date("2026-05-24T01:00:00.000Z"),
      endsAt: new Date("2026-05-24T02:00:00.000Z"),
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
            user: { id: "student-user-1" },
          },
        },
      ],
    },
  };
}

describe("PATCH .../reschedule-requests/[requestId]", () => {
  const ctx = {
    params: Promise.resolve({ orgId, schoolId, bookingId, requestId }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    getConflictMock.mockResolvedValue(null);
    applyMock.mockResolvedValue({ calendarUpdated: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("403 when caller is teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1" } });
    findFirstMembershipMock.mockResolvedValue({
      id: "tm-teacher",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "teacher-user-1",
    });
    findFirstRequestMock.mockResolvedValue(pendingRequest());

    const res = await PATCH(
      new Request(
        `http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      ),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(applyMock).not.toHaveBeenCalled();
  });

  test("200 admin approves and applies reschedule", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findFirstRequestMock.mockResolvedValue(pendingRequest());

    const res = await PATCH(
      new Request(
        `http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      ),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(applyMock).toHaveBeenCalled();
    expect(updateRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: requestId },
        data: expect.objectContaining({
          status: SchoolBookingRescheduleRequestStatus.APPROVED,
        }),
      }),
    );
  });

  test("200 admin rejects and notifies teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user" } });
    findFirstMembershipMock.mockResolvedValue(adminMembership());
    findFirstRequestMock.mockResolvedValue(pendingRequest());

    const res = await PATCH(
      new Request(
        `http://localhost/api/org/${orgId}/schools/${schoolId}/classes/${bookingId}/reschedule-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", rejectReason: "No room" }),
        },
      ),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(applyMock).not.toHaveBeenCalled();
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "teacher-user-1",
        titleEn: expect.stringContaining("declined") as unknown as string,
      }),
    );
  });
});
