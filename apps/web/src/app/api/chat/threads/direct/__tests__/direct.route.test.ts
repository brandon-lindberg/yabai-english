import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findUserMock, ensureAdminUserThreadMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUserMock: vi.fn(),
  ensureAdminUserThreadMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
  },
}));

vi.mock("@/lib/chat-threads", () => ({
  ensureAdminUserThread: ensureAdminUserThreadMock,
}));

import { POST } from "@/app/api/chat/threads/direct/route";

function request(body: unknown) {
  return new Request("http://localhost/api/chat/threads/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/threads/direct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    findUserMock.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    ensureAdminUserThreadMock.mockResolvedValue({ id: "admin-teacher-thread" });
  });

  test("returns the admin's own thread with the target user", async () => {
    const res = await POST(request({ userId: "teacher-1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threadId: "admin-teacher-thread" });
    expect(ensureAdminUserThreadMock).toHaveBeenCalledWith("admin-1", {
      id: "teacher-1",
      role: "TEACHER",
    });
  });

  test("rejects non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });

    const res = await POST(request({ userId: "student-1" }));

    expect(res.status).toBe(403);
    expect(ensureAdminUserThreadMock).not.toHaveBeenCalled();
  });

  test("rejects targeting another admin", async () => {
    findUserMock.mockResolvedValue({ id: "admin-2", role: "SUPER_ADMIN" });

    const res = await POST(request({ userId: "admin-2" }));

    expect(res.status).toBe(400);
    expect(ensureAdminUserThreadMock).not.toHaveBeenCalled();
  });

  test("returns not found for an unknown user", async () => {
    findUserMock.mockResolvedValue(null);

    const res = await POST(request({ userId: "nobody" }));

    expect(res.status).toBe(404);
    expect(ensureAdminUserThreadMock).not.toHaveBeenCalled();
  });
});
