import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findThreadMock, updateThreadMock, emitChatUpdateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findThreadMock: vi.fn(),
  updateThreadMock: vi.fn(),
  emitChatUpdateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatThread: {
      findUnique: findThreadMock,
      update: updateThreadMock,
    },
  },
}));

vi.mock("@/lib/realtime-server", () => ({
  emitChatUpdate: emitChatUpdateMock,
}));

import { POST } from "@/app/api/chat/threads/[threadId]/permissions/route";

describe("POST /api/chat/threads/[threadId]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      studentBlockedAt: null,
      teacherBlockedAt: null,
    });
    updateThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
    });
  });

  test("rejects teacher from changing two-way setting", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoWayEnabled: true }),
      }),
      { params: Promise.resolve({ threadId: "thread-1" }) },
    );
    expect(res.status).toBe(403);
    expect(updateThreadMock).not.toHaveBeenCalled();
  });

  test("allows admin to change two-way setting", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoWayEnabled: true }),
      }),
      { params: Promise.resolve({ threadId: "thread-1" }) },
    );
    expect(res.status).toBe(200);
    expect(updateThreadMock).toHaveBeenCalledWith({
      where: { id: "thread-1" },
      data: {
        twoWayEnabled: true,
        twoWayEnabledByRole: "ADMIN",
      },
    });
  });
});
