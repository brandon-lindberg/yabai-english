import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET } from "@/app/api/admin/users/route";

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(401);
  });

  test("403 when not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(403);
  });

  test("200 returns paged users for admin", async () => {
    authMock.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    const rows = [
      {
        id: "a",
        name: "A",
        email: "a@test.com",
        role: "STUDENT",
        locale: "ja",
        accountStatus: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        studentProfile: { placedLevel: "UNSET", placementNeedsReview: false, timezone: "Asia/Tokyo" },
        teacherProfile: null,
      },
    ];
    prismaMock.$transaction.mockResolvedValue([rows, 1]);

    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.items).toHaveLength(1);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});
