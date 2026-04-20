import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolScheduleSlot: { findUnique: vi.fn() },
    schoolScheduleSkip: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/org/[orgId]/schools/[schoolId]/schedule/[slotId]/skip/route";

const orgId = "org-1";
const schoolId = "school-1";
const slotId = "slot-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId, slotId }) };

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}/skip`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}

describe("POST /api/org/.../schedule/[slotId]/skip", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when TEACHER tries to skip", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    const res = await POST(
      postReq({ startsAtIso: "2026-04-25T10:00:00Z" }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("409 when occurrence already skipped", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findUnique.mockResolvedValue({
      id: slotId, schoolId,
    });
    prismaMock.schoolScheduleSkip.findUnique.mockResolvedValue({
      id: "skip-1",
    });
    const res = await POST(
      postReq({ startsAtIso: "2026-04-25T10:00:00Z" }),
      routeCtx,
    );
    expect(res.status).toBe(409);
  });

  test("201 creates skip", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolScheduleSlot.findUnique.mockResolvedValue({
      id: slotId, schoolId,
    });
    prismaMock.schoolScheduleSkip.findUnique.mockResolvedValue(null);
    prismaMock.schoolScheduleSkip.create.mockResolvedValue({
      id: "skip-1", scheduleSlotId: slotId,
      startsAtIso: "2026-04-25T10:00:00Z",
    });
    const res = await POST(
      postReq({ startsAtIso: "2026-04-25T10:00:00Z", reason: "Holiday" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.skip.startsAtIso).toBe("2026-04-25T10:00:00Z");
  });
});
