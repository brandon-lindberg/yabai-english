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

  test("400 with invalid body (missing name)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await POST(jsonReq({ slug: "test-org" }));
    expect(res.status).toBe(400);
  });

  test("400 with invalid slug (spaces)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await POST(jsonReq({ name: "Test", slug: "bad slug" }));
    expect(res.status).toBe(400);
  });

  test("409 when slug is taken", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organization.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      jsonReq({ name: "Test Org", slug: "test-org", schoolName: "Main Campus" }),
    );
    expect(res.status).toBe(409);
  });

  test("201 creates org + school + owner membership", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organization.findUnique.mockResolvedValue(null);

    const createdOrg = {
      id: "org-1",
      slug: "test-org",
      name: "Test Org",
      createdAt: new Date(),
    };
    const createdSchool = {
      id: "school-1",
      slug: "main-campus",
      name: "Main Campus",
    };
    const createdMembership = {
      id: "mem-1",
      orgRole: "OWNER",
      status: "ACTIVE",
    };

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
      return fn(prismaMock);
    });
    prismaMock.organization.create.mockResolvedValue(createdOrg);
    prismaMock.school.create.mockResolvedValue(createdSchool);
    prismaMock.organizationMembership.create.mockResolvedValue(createdMembership);

    const res = await POST(
      jsonReq({
        name: "Test Org",
        slug: "test-org",
        schoolName: "Main Campus",
        schoolSlug: "main-campus",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.organization.id).toBe("org-1");
    expect(body.school.id).toBe("school-1");
    expect(body.membership.orgRole).toBe("OWNER");
  });
});
