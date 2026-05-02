import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organization: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    organizationMembership: {
      create: vi.fn(),
    },
    school: {
      create: vi.fn(),
    },
    schoolClassLevel: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    schoolClassType: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/org/route";

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/org", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(jsonReq({ name: "Test Org", slug: "test-org" }));
    expect(res.status).toBe(401);
  });

  test("403 when caller is not SUPER_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await POST(
      jsonReq({
        name: "Test Org",
        slug: "test-org",
        schoolName: "Main Campus",
        ownerEmail: "owner@test.com",
      }),
    );
    expect(res.status).toBe(403);
  });

  test("400 with invalid body (missing name)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } });
    const res = await POST(jsonReq({ slug: "test-org" }));
    expect(res.status).toBe(400);
  });

  test("400 with invalid slug (spaces)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } });
    const res = await POST(jsonReq({ name: "Test", slug: "bad slug" }));
    expect(res.status).toBe(400);
  });

  test("404 when ownerEmail does not match a user", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq({
        name: "Test Org",
        slug: "test-org",
        schoolName: "Main Campus",
        ownerEmail: "ghost@test.com",
      }),
    );
    expect(res.status).toBe(404);
  });

  test("409 when slug is taken", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "owner-1" });
    prismaMock.organization.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      jsonReq({
        name: "Test Org",
        slug: "test-org",
        schoolName: "Main Campus",
        ownerEmail: "owner@test.com",
      }),
    );
    expect(res.status).toBe(409);
  });

  test("201 creates org + school + owner membership pointing at ownerEmail user", async () => {
    authMock.mockResolvedValue({ user: { id: "super-1", role: "SUPER_ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "owner-1" });
    prismaMock.organization.findUnique.mockResolvedValue(null);

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
      return fn(prismaMock);
    });
    prismaMock.organization.create.mockResolvedValue({
      id: "org-1", slug: "test-org", name: "Test Org", createdAt: new Date(),
    });
    prismaMock.school.create.mockResolvedValue({
      id: "school-1", slug: "main-campus", name: "Main Campus",
    });
    prismaMock.organizationMembership.create.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE", userId: "owner-1",
    });

    const res = await POST(
      jsonReq({
        name: "Test Org",
        slug: "test-org",
        schoolName: "Main Campus",
        schoolSlug: "main-campus",
        ownerEmail: "owner@test.com",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.membership.userId).toBe("owner-1");
    expect(prismaMock.organizationMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "owner-1", orgRole: "OWNER" }),
      }),
    );
  });
});
