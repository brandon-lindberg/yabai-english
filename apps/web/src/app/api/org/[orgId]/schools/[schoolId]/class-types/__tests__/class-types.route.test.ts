import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolClassType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  GET,
  POST,
} from "@/app/api/org/[orgId]/schools/[schoolId]/class-types/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-types`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function getReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-types`,
  );
}

describe("GET /api/org/.../class-types", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("200 returns types for any school member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findMany.mockResolvedValue([
      {
        id: "t-1",
        code: "conversation",
        label: "Conversation",
        labelJa: "会話",
        labelEn: "Conversation",
        sortOrder: 0,
        active: true,
      },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classTypes).toHaveLength(1);
    expect(body.classTypes[0].code).toBe("conversation");
  });
});

describe("POST /api/org/.../class-types", () => {
  beforeEach(() => vi.clearAllMocks());

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
      postReq({ labelEn: "Conversation" }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("400 when label missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(postReq({ labelEn: "" }), routeCtx);
    expect(res.status).toBe(400);
  });

  test("201 auto-computes sortOrder as max(existing)+1 when omitted", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findMany.mockResolvedValue([
      { id: "t-existing", sortOrder: 7 },
    ]);
    prismaMock.schoolClassType.create.mockResolvedValue({
      id: "t-new",
      schoolId,
      code: "grammar",
      label: "Grammar",
      labelJa: null,
      labelEn: null,
      sortOrder: 8,
      active: true,
    });
    const res = await POST(
      postReq({ labelEn: "Grammar" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.schoolClassType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 8 }),
    });
  });

  test("409 when an ACTIVE row with the same code already exists", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: "t-existing",
      schoolId,
      code: "conversation",
      active: true,
    });
    const res = await POST(
      postReq({ labelEn: "Conversation" }),
      routeCtx,
    );
    expect(res.status).toBe(409);
    expect(prismaMock.schoolClassType.create).not.toHaveBeenCalled();
  });

  test("201 reactivates a soft-deleted row with the same code", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: "t-old",
      schoolId,
      code: "conversation",
      active: false,
    });
    prismaMock.schoolClassType.findMany.mockResolvedValue([]);
    prismaMock.schoolClassType.update.mockResolvedValue({
      id: "t-old",
      schoolId,
      code: "conversation",
      label: "Conversation",
      labelJa: null,
      labelEn: null,
      sortOrder: 0,
      active: true,
    });
    const res = await POST(
      postReq({ labelEn: "Conversation" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.schoolClassType.create).not.toHaveBeenCalled();
    expect(prismaMock.schoolClassType.update).toHaveBeenCalledWith({
      where: { id: "t-old" },
      data: expect.objectContaining({ active: true }),
    });
  });

  test("201 creates type for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findMany.mockResolvedValue([]);
    prismaMock.schoolClassType.create.mockResolvedValue({
      id: "t-1",
      schoolId,
      code: "conversation",
      label: "Conversation",
      labelJa: "会話",
      labelEn: "Conversation",
      sortOrder: 0,
      active: true,
    });
    const res = await POST(
      postReq({
        code: "conversation",
        label: "Conversation",
        labelJa: "会話",
        labelEn: "Conversation",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.classType.code).toBe("conversation");
  });
});
