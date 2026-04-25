import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolClassType: {
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
      postReq({ code: "conversation", label: "Conversation" }),
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
    const res = await POST(postReq({ code: "conversation" }), routeCtx);
    expect(res.status).toBe(400);
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
