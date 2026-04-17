import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  findThreadMock,
  findTeacherProfileMock,
  findBookingMock,
  findUserMock,
  createMessageMock,
  canSendChatMessageMock,
  emitChatUpdateMock,
  createUserNotificationMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findThreadMock: vi.fn(),
  findTeacherProfileMock: vi.fn(),
  findBookingMock: vi.fn(),
  findUserMock: vi.fn(),
  createMessageMock: vi.fn(),
  canSendChatMessageMock: vi.fn(),
  emitChatUpdateMock: vi.fn(),
  createUserNotificationMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatThread: {
      findUnique: findThreadMock,
    },
    teacherProfile: {
      findFirst: findTeacherProfileMock,
    },
    booking: {
      findFirst: findBookingMock,
    },
    chatMessage: {
      create: createMessageMock,
    },
    user: {
      findUnique: findUserMock,
    },
  },
}));

vi.mock("@/lib/chat-permissions", () => ({
  canSendChatMessage: canSendChatMessageMock,
}));

vi.mock("@/lib/realtime-server", () => ({
  emitChatUpdate: emitChatUpdateMock,
}));

vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));

import { POST } from "@/app/api/chat/threads/[threadId]/messages/route";

describe("POST /api/chat/threads/[threadId]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: { id: "student-1", role: "STUDENT" },
    });
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
      studentBlockedAt: null,
      teacherBlockedAt: null,
    });
    findTeacherProfileMock.mockResolvedValue({ id: "teacher-profile-1" });
    findBookingMock.mockResolvedValue({ id: "booking-1" });
    findUserMock.mockResolvedValue({ role: "TEACHER" });
    canSendChatMessageMock.mockReturnValue(true);
    createMessageMock.mockResolvedValue({
      id: "msg-1",
      threadId: "thread-1",
      senderId: "student-1",
      recipientId: "teacher-1",
      body: "hello",
    });
  });

  test("sends chat updates but does not create a notification item", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello" }),
      }),
      {
        params: Promise.resolve({ threadId: "thread-1" }),
      },
    );

    expect(res.status).toBe(200);
    expect(createMessageMock).toHaveBeenCalledWith({
      data: {
        threadId: "thread-1",
        senderId: "student-1",
        recipientId: "teacher-1",
        body: "hello",
      },
    });
    expect(createUserNotificationMock).not.toHaveBeenCalled();
    expect(emitChatUpdateMock).toHaveBeenCalledTimes(2);
    expect(emitChatUpdateMock).toHaveBeenNthCalledWith(
      1,
      "student-1",
      "thread-1",
    );
    expect(emitChatUpdateMock).toHaveBeenNthCalledWith(
      2,
      "teacher-1",
      "thread-1",
    );
    expect(canSendChatMessageMock).toHaveBeenCalledWith({
      role: "STUDENT",
      threadTwoWayEnabled: true,
      hasScheduledLessonWithTeacher: true,
      counterpartRole: "TEACHER",
    });
  });

  test("rejects sending when the conversation is blocked", async () => {
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
      studentBlockedAt: new Date().toISOString(),
      teacherBlockedAt: null,
    });

    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello" }),
      }),
      {
        params: Promise.resolve({ threadId: "thread-1" }),
      },
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Messaging is blocked for this conversation.",
    });
    expect(createMessageMock).not.toHaveBeenCalled();
    expect(emitChatUpdateMock).not.toHaveBeenCalled();
  });

  test("returns not found when sender is blocked by counterpart", async () => {
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
      studentBlockedAt: null,
      teacherBlockedAt: new Date().toISOString(),
    });

    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello" }),
      }),
      {
        params: Promise.resolve({ threadId: "thread-1" }),
      },
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  test("creates notification when a teacher sends a message to a student", async () => {
    authMock.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER" },
    });
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
      studentBlockedAt: null,
      teacherBlockedAt: null,
    });
    findTeacherProfileMock.mockResolvedValue({ id: "teacher-profile-1" });
    findBookingMock.mockResolvedValue({ id: "booking-1" });
    findUserMock.mockResolvedValue({ role: "STUDENT" });
    canSendChatMessageMock.mockReturnValue(true);
    createMessageMock.mockResolvedValue({
      id: "msg-teacher-1",
      threadId: "thread-1",
      senderId: "teacher-1",
      recipientId: "student-1",
      body: "See you tomorrow",
    });

    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "See you tomorrow" }),
      }),
      {
        params: Promise.resolve({ threadId: "thread-1" }),
      },
    );

    expect(res.status).toBe(200);
    expect(createUserNotificationMock).toHaveBeenCalledWith({
      userId: "student-1",
      titleJa: "先生から新しいメッセージがあります",
      titleEn: "You have a new message from your teacher",
      bodyJa: "See you tomorrow",
      bodyEn: "See you tomorrow",
    });
  });

  test("creates notification when admin sends a message", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    findThreadMock.mockResolvedValue({
      id: "thread-1",
      studentId: "student-1",
      teacherId: "admin-1",
      twoWayEnabled: false,
      studentBlockedAt: null,
      teacherBlockedAt: null,
    });
    findTeacherProfileMock.mockResolvedValue(null);
    findBookingMock.mockResolvedValue(null);
    findUserMock.mockResolvedValue({ role: "STUDENT" });
    canSendChatMessageMock.mockReturnValue(true);
    createMessageMock.mockResolvedValue({
      id: "msg-admin-1",
      threadId: "thread-1",
      senderId: "admin-1",
      recipientId: "student-1",
      body: "Admin update",
    });

    const res = await POST(
      new Request("http://localhost/api/chat/threads/thread-1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Admin update" }),
      }),
      {
        params: Promise.resolve({ threadId: "thread-1" }),
      },
    );

    expect(res.status).toBe(200);
    expect(createUserNotificationMock).toHaveBeenCalledWith({
      userId: "student-1",
      titleJa: "管理者から新しいメッセージがあります",
      titleEn: "You have a new message from admin",
      bodyJa: "Admin update",
      bodyEn: "Admin update",
    });
  });
});
