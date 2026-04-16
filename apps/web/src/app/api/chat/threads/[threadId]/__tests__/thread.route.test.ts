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

import { DELETE } from "@/app/api/chat/threads/[threadId]/route";

describe("DELETE /api/chat/threads/[threadId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      studentBlockedAt: null,
      teacherBlockedAt: null,
    });
  });

  test("archives student side for student participant", async () => {
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const res = await DELETE(new Request("http://localhost/api/chat/threads/thread-1"), {
      params: Promise.resolve({ threadId: "thread-1" }),
    });
    expect(res.status).toBe(200);
    expect(updateThreadMock).toHaveBeenCalledWith({
      where: { id: "thread-1" },
      data: { studentArchivedAt: expect.any(Date) },
    });
    expect(emitChatUpdateMock).toHaveBeenCalledTimes(2);
  });

  test("forbids non-participant", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const res = await DELETE(new Request("http://localhost/api/chat/threads/thread-1"), {
      params: Promise.resolve({ threadId: "thread-1" }),
    });
    expect(res.status).toBe(403);
    expect(updateThreadMock).not.toHaveBeenCalled();
  });
});
