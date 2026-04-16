import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
      count: vi.fn(),
    },
    studentProfile: {
      create: vi.fn(),
    },
    teacherProfile: {
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
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

import { DELETE, GET, PATCH } from "@/app/api/admin/users/[userId]/route";

const params = Promise.resolve({ userId: "target" });

describe("GET /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("404 when user missing", async () => {
    authMock.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/admin/users/target"), { params });
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(404);
  });

  test("strips calendar refresh token from teacher profile", async () => {
    authMock.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "target",
      email: "t@test.com",
      teacherProfile: {
        id: "tp",
        userId: "target",
        googleCalendarRefreshToken: "secret",
        displayName: "T",
        bio: null,
        countryOfOrigin: null,
        credentials: null,
        instructionLanguages: ["EN"],
        specialties: [],
        rateYen: 1000,
        offersFreeTrial: true,
        calendarId: "primary",
      },
      studentProfile: null,
    });

    const res = await GET(new Request("http://localhost/api/admin/users/target"), { params });
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      teacherProfile: { calendarConnected: boolean; googleCalendarRefreshToken?: string };
    };
    expect(body.teacherProfile.calendarConnected).toBe(true);
    expect(body.teacherProfile.googleCalendarRefreshToken).toBeUndefined();
  });
});

describe("PATCH /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("invalidates sessions when account becomes HIDDEN", async () => {
    authMock.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: "target",
        role: "STUDENT",
        accountStatus: "ACTIVE",
        studentProfile: { id: "sp" },
        teacherProfile: null,
      })
      .mockResolvedValueOnce({
        id: "target",
        email: "t@test.com",
        studentProfile: {},
        teacherProfile: null,
      });

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<void>) => {
      await fn(prismaMock);
    });

    const res = await PATCH(
      new Request("http://localhost/api/admin/users/target", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: "HIDDEN" }),
      }),
      { params },
    );

    if (!res) throw new Error("expected response");
    expect(res.status).toBe(200);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "target" },
    });
  });
});

describe("DELETE /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("400 when deleting self", async () => {
    authMock.mockResolvedValue({ user: { id: "same", role: "ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "same", role: "ADMIN" });
    prismaMock.user.count.mockResolvedValue(2);

    const res = await DELETE(new Request("http://localhost/api/admin/users/same"), {
      params: Promise.resolve({ userId: "same" }),
    });
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  test("403 when deleting last admin", async () => {
    authMock.mockResolvedValue({ user: { id: "a", role: "ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "b", role: "ADMIN" });
    prismaMock.user.count.mockResolvedValue(1);

    const res = await DELETE(new Request("http://localhost/api/admin/users/b"), {
      params: Promise.resolve({ userId: "b" }),
    });
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(403);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  test("204/200 deletes when allowed", async () => {
    authMock.mockResolvedValue({ user: { id: "a", role: "ADMIN" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "b", role: "STUDENT" });
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.delete.mockResolvedValue({});

    const res = await DELETE(new Request("http://localhost/api/admin/users/b"), {
      params: Promise.resolve({ userId: "b" }),
    });
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "b" } });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});
