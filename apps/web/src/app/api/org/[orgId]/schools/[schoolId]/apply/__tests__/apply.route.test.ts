import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    school: { findUnique: vi.fn() },
    organizationMembership: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/org/[orgId]/schools/[schoolId]/apply/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/apply`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}

describe("POST /api/org/.../apply", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(postReq({}), routeCtx);
    expect(res.status).toBe(401);
  });

  test("404 when school not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.school.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({}), routeCtx);
    expect(res.status).toBe(404);
  });

  test("400 when application flow disabled", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, organizationId: orgId, applicationFlowEnabled: false,
    });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await POST(postReq({}), routeCtx);
    expect(res.status).toBe(400);
  });

  test("400 when already a member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, organizationId: orgId, applicationFlowEnabled: true,
    });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", status: "ACTIVE",
    });
    const res = await POST(postReq({}), routeCtx);
    expect(res.status).toBe(400);
  });

  test("201 creates application", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, organizationId: orgId, applicationFlowEnabled: true,
    });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    prismaMock.organizationMembership.create.mockResolvedValue({
      id: "mem-1", status: "PENDING_APPROVAL", orgRole: "STUDENT",
    });
    const res = await POST(
      postReq({ applicationNote: "I want to learn!" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.application.status).toBe("PENDING_APPROVAL");
  });

  test("201 re-applies after denial (INACTIVE)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, organizationId: orgId, applicationFlowEnabled: true,
    });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-old", status: "INACTIVE",
    });
    prismaMock.organizationMembership.update.mockResolvedValue({
      id: "mem-old", status: "PENDING_APPROVAL", orgRole: "STUDENT",
    });
    const res = await POST(
      postReq({ applicationNote: "Please reconsider" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.application.status).toBe("PENDING_APPROVAL");
  });
});
