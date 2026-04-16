import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, emitChatUpdateMock, createUserNotificationMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findMany: vi.fn(),
    },
    chatThread: {
      upsert: vi.fn(),
    },
    chatMessage: {
      createMany: vi.fn(),
    },
    adminBroadcast: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  emitChatUpdateMock: vi.fn(),
  createUserNotificationMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/realtime-server", () => ({
  emitChatUpdate: emitChatUpdateMock,
}));

vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));

import { GET, POST } from "@/app/api/admin/chat/broadcast/route";

describe("POST /api/admin/chat/broadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.adminBroadcast.create.mockResolvedValue({ id: "b1" });
  });

  test("rejects unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/admin/chat/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello", target: "all" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test("rejects non-admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    const res = await POST(
      new Request("http://localhost/api/admin/chat/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello", target: "all" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  test("GET lists admin broadcast history", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.adminBroadcast.findMany.mockResolvedValue([
      {
        id: "b1",
        senderId: "admin-1",
        target: "ALL",
        body: "Notice",
        targetedRecipients: 2,
        sentMessages: 2,
        createdAt: new Date("2026-04-16T01:00:00.000Z"),
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items[0]?.id).toBe("b1");
  });

  test("broadcasts to teachers only", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "t-1", role: "TEACHER" },
      { id: "t-2", role: "TEACHER" },
    ]);
    prismaMock.chatThread.upsert
      .mockResolvedValueOnce({ id: "admin-thread-t1" })
      .mockResolvedValueOnce({ id: "admin-thread-t2" });
    prismaMock.chatMessage.createMany.mockResolvedValue({ count: 2 });

    const res = await POST(
      new Request("http://localhost/api/admin/chat/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Teacher update", target: "teachers" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.findMany).toHaveBeenCalled();
    expect(prismaMock.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        {
          threadId: "admin-thread-t1",
          senderId: "admin-1",
          recipientId: "t-1",
          body: "Teacher update",
        },
        {
          threadId: "admin-thread-t2",
          senderId: "admin-1",
          recipientId: "t-2",
          body: "Teacher update",
        },
      ],
    });
    expect(prismaMock.chatThread.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: { twoWayEnabled: false, twoWayEnabledByRole: null },
      }),
    );
    expect(emitChatUpdateMock).toHaveBeenCalledTimes(4);
    expect(createUserNotificationMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.adminBroadcast.create).toHaveBeenCalledWith({
      data: {
        senderId: "admin-1",
        target: "TEACHERS",
        body: "Teacher update",
        targetedRecipients: 2,
        sentMessages: 2,
      },
    });
  });

  test("broadcasts to both teachers and students", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "t-1", role: "TEACHER" },
      { id: "s-1", role: "STUDENT" },
    ]);
    prismaMock.chatThread.upsert
      .mockResolvedValueOnce({ id: "admin-thread-t1" })
      .mockResolvedValueOnce({ id: "admin-thread-s1" });
    prismaMock.chatMessage.createMany.mockResolvedValue({ count: 2 });

    const res = await POST(
      new Request("http://localhost/api/admin/chat/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "All update", target: "all" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        {
          threadId: "admin-thread-t1",
          senderId: "admin-1",
          recipientId: "t-1",
          body: "All update",
        },
        {
          threadId: "admin-thread-s1",
          senderId: "admin-1",
          recipientId: "s-1",
          body: "All update",
        },
      ],
    });
    const body = (await res.json()) as { targetedRecipients: number };
    expect(body.targetedRecipients).toBe(2);
    expect(prismaMock.adminBroadcast.create).toHaveBeenCalledWith({
      data: {
        senderId: "admin-1",
        target: "ALL",
        body: "All update",
        targetedRecipients: 2,
        sentMessages: 2,
      },
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});
