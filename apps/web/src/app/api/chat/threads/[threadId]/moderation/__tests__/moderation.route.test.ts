import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findThreadMock, updateThreadMock, emitChatUpdateMock } =
  vi.hoisted(() => ({
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

import { POST } from "@/app/api/chat/threads/[threadId]/moderation/route";

describe("POST /api/chat/threads/[threadId]/moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: { id: "student-1", role: "STUDENT" },
    });
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
    });
    updateThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
    });
  });

  test("records student report and auto-blocks the thread", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", reason: "Inappropriate content" }),
      }),
      { params: Promise.resolve({ threadId: "thread-1" }) },
    );

    expect(res.status).toBe(200);
    expect(updateThreadMock).toHaveBeenCalledTimes(1);
    expect(updateThreadMock.mock.calls[0][0]).toMatchObject({
      where: { id: "thread-1" },
      data: {
        studentReportedAt: expect.any(Date),
        studentReportReason: "Inappropriate content",
        studentBlockedAt: expect.any(Date),
      },
    });
    expect(emitChatUpdateMock).toHaveBeenCalledTimes(2);
  });

  test("rejects report without a reason", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", reason: "   " }),
      }),
      { params: Promise.resolve({ threadId: "thread-1" }) },
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Report reason is required.",
    });
    expect(updateThreadMock).not.toHaveBeenCalled();
  });
});
