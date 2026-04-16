import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    chatThread: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET } from "@/app/api/admin/reports/chat-threads/route";

describe("GET /api/admin/reports/chat-threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("403 when not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  test("200 returns reported threads", async () => {
    authMock.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "th1",
        studentReportedAt: new Date(),
        teacherReportedAt: null,
        studentReportReason: "spam",
        teacherReportReason: null,
        student: { id: "s", name: "S", email: "s@test.com", role: "STUDENT" },
        teacher: { id: "t", name: "T", email: "t@test.com", role: "TEACHER" },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
    expect(prismaMock.chatThread.findMany).toHaveBeenCalled();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});
