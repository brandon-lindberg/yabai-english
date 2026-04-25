import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolClassLevel: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  GET,
  POST,
} from "@/app/api/org/[orgId]/schools/[schoolId]/class-levels/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-levels`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function getReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-levels`,
  );
}

describe("GET /api/org/.../class-levels", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("403 when not a member of the org", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 returns levels for any school member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassLevel.findMany.mockResolvedValue([
      {
        id: "lvl-1",
        code: "year-7",
        label: "Year 7",
        labelJa: "中学1年",
        labelEn: "Year 7",
        sortOrder: 0,
        active: true,
      },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classLevels).toHaveLength(1);
    expect(body.classLevels[0].code).toBe("year-7");
  });
});

describe("POST /api/org/.../class-levels", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(
      postReq({ code: "year-7", label: "Year 7" }),
      routeCtx,
    );
    expect(res.status).toBe(401);
  });

  test("403 when TEACHER tries to create", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({ code: "year-7", label: "Year 7" }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("403 when STUDENT tries to create", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({ code: "year-7", label: "Year 7" }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("400 when code/label missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(postReq({ code: "" }), routeCtx);
    expect(res.status).toBe(400);
  });

  test("201 creates level for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassLevel.create.mockResolvedValue({
      id: "lvl-1",
      schoolId,
      code: "year-7",
      label: "Year 7",
      labelJa: null,
      labelEn: null,
      sortOrder: 0,
      active: true,
    });
    const res = await POST(
      postReq({ code: "year-7", label: "Year 7" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.classLevel.code).toBe("year-7");
    expect(prismaMock.schoolClassLevel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId,
        code: "year-7",
        label: "Year 7",
      }),
    });
  });

  test("201 creates level for ORG_ADMIN (org-wide)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "ORG_ADMIN",
      status: "ACTIVE",
      schoolId: null,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassLevel.create.mockResolvedValue({
      id: "lvl-1",
      schoolId,
      code: "eiken-pre-2",
      label: "Eiken Pre-2",
      labelJa: "英検準2級",
      labelEn: "Eiken Pre-2",
      sortOrder: 5,
      active: true,
    });
    const res = await POST(
      postReq({
        code: "eiken-pre-2",
        label: "Eiken Pre-2",
        labelJa: "英検準2級",
        labelEn: "Eiken Pre-2",
        sortOrder: 5,
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
  });
});
