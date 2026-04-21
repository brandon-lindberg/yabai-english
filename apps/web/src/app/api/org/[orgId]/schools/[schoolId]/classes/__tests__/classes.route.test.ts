import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, syncMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolScheduleSlot: { findMany: vi.fn() },
    schoolBooking: { findMany: vi.fn(), createMany: vi.fn() },
  },
  syncMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/school-calendar-sync", () => ({
  syncSchoolBookingsToCalendar: syncMock,
}));

import { GET } from "@/app/api/org/[orgId]/schools/[schoolId]/classes/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function getReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/classes`,
  );
}

describe("GET /api/org/.../classes", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("403 when caller has no membership", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("403 when school-scoped caller queries wrong school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "STUDENT", status: "ACTIVE",
      schoolId: "other-school", organizationId: orgId, userId: "u1",
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 returns upcoming classes for authorized school member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "STUDENT", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([]);
    prismaMock.schoolBooking.findMany.mockResolvedValue([]);
    prismaMock.schoolBooking.createMany.mockResolvedValue({ count: 0 });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classes).toEqual([]);
  });

  test("does not call calendar sync when nothing is materialized", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "STUDENT", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([]);
    prismaMock.schoolBooking.findMany.mockResolvedValue([]);
    await GET(getReq(), routeCtx);
    expect(syncMock).not.toHaveBeenCalled();
  });

  test("calls calendar sync after materializing new bookings", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        dayOfWeek: 1,
        startMin: 600,
        endMin: 660,
        durationMin: 60,
        timezone: "Asia/Tokyo",
        assignedTeacherMembershipId: "teacher-mem-1",
        skips: [],
      },
    ]);
    prismaMock.schoolBooking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.schoolBooking.createMany.mockResolvedValue({ count: 2 });
    await GET(getReq(), routeCtx);
    expect(syncMock).toHaveBeenCalledWith(schoolId, expect.any(Date), expect.any(Date));
  });

  test("materializes missing bookings for active slots", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        dayOfWeek: 1,
        startMin: 600,
        endMin: 660,
        durationMin: 60,
        timezone: "Asia/Tokyo",
        assignedTeacherMembershipId: "teacher-mem-1",
        skips: [],
      },
    ]);
    prismaMock.schoolBooking.findMany
      .mockResolvedValueOnce([]) // existing lookup inside loop
      .mockResolvedValueOnce([]); // final listing
    prismaMock.schoolBooking.createMany.mockResolvedValue({ count: 2 });

    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    expect(prismaMock.schoolBooking.createMany).toHaveBeenCalled();
  });
});
