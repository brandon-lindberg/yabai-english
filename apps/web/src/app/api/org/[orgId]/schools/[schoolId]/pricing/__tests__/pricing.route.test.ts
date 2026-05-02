import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolLessonPricing: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/org/[orgId]/schools/[schoolId]/pricing/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/pricing`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}

function getReq() {
  return new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}/pricing`);
}

describe("GET /api/org/.../pricing", () => {
  beforeEach(() => vi.clearAllMocks());

  test("200 returns pricing for member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "STUDENT", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolLessonPricing.findMany.mockResolvedValue([
      { id: "p1", durationMin: 50, priceYen: 3000 },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pricing).toHaveLength(1);
  });
});

describe("POST /api/org/.../pricing", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when TEACHER tries to create pricing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    const res = await POST(
      postReq({ durationMin: 50, priceYen: 3000 }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("201 creates pricing for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.schoolLessonPricing.create.mockResolvedValue({
      id: "p1", durationMin: 50, priceYen: 3000, schoolId,
    });
    const res = await POST(
      postReq({ durationMin: 50, priceYen: 3000, lessonLevel: "beginner" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pricing.priceYen).toBe(3000);
  });
});
