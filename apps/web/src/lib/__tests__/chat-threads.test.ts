import { beforeEach, describe, expect, test, vi } from "vitest";

const { upsertThreadMock, updateThreadMock } = vi.hoisted(() => ({
  upsertThreadMock: vi.fn(),
  updateThreadMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatThread: {
      upsert: upsertThreadMock,
      update: updateThreadMock,
    },
  },
}));

import {
  adminThreadSlots,
  chatThreadParticipantWhere,
  ensureAdminUserThread,
  resolveChatRecipientId,
  touchChatThread,
} from "@/lib/chat-threads";

describe("adminThreadSlots", () => {
  test("puts the admin in the student slot when messaging a teacher", () => {
    expect(adminThreadSlots("admin-1", { id: "teacher-1", role: "TEACHER" })).toEqual({
      studentId: "admin-1",
      teacherId: "teacher-1",
    });
  });

  test("puts the admin in the teacher slot when messaging a student", () => {
    expect(adminThreadSlots("admin-1", { id: "student-1", role: "STUDENT" })).toEqual({
      studentId: "student-1",
      teacherId: "admin-1",
    });
  });
});

describe("resolveChatRecipientId", () => {
  const thread = { studentId: "student-1", teacherId: "teacher-1" };

  test("returns the teacher when the student sends", () => {
    expect(resolveChatRecipientId(thread, "student-1")).toBe("teacher-1");
  });

  test("returns the student when the teacher sends", () => {
    expect(resolveChatRecipientId(thread, "teacher-1")).toBe("student-1");
  });

  test("returns null for a sender who is not in the thread", () => {
    expect(resolveChatRecipientId(thread, "admin-1")).toBeNull();
  });
});

describe("chatThreadParticipantWhere", () => {
  test("matches threads where the user sits in either slot", () => {
    expect(chatThreadParticipantWhere("user-1")).toEqual({
      OR: [{ studentId: "user-1" }, { teacherId: "user-1" }],
    });
  });
});

describe("ensureAdminUserThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertThreadMock.mockResolvedValue({ id: "thread-1" });
  });

  test("creates a dedicated admin thread with a teacher and opens two-way", async () => {
    await ensureAdminUserThread("admin-1", { id: "teacher-1", role: "TEACHER" });

    expect(upsertThreadMock).toHaveBeenCalledWith({
      where: {
        studentId_teacherId: { studentId: "admin-1", teacherId: "teacher-1" },
      },
      update: { twoWayEnabled: true, twoWayEnabledByRole: "SUPER_ADMIN" },
      create: {
        studentId: "admin-1",
        teacherId: "teacher-1",
        twoWayEnabled: true,
        twoWayEnabledByRole: "SUPER_ADMIN",
      },
    });
  });

  test("keeps admin threads with students read-only until two-way is enabled", async () => {
    await ensureAdminUserThread("admin-1", { id: "student-1", role: "STUDENT" });

    expect(upsertThreadMock).toHaveBeenCalledWith({
      where: {
        studentId_teacherId: { studentId: "student-1", teacherId: "admin-1" },
      },
      update: { twoWayEnabled: false, twoWayEnabledByRole: null },
      create: {
        studentId: "student-1",
        teacherId: "admin-1",
        twoWayEnabled: false,
        twoWayEnabledByRole: null,
      },
    });
  });
});

describe("touchChatThread", () => {
  test("bumps updatedAt so threads with new messages sort to the top", async () => {
    vi.clearAllMocks();
    updateThreadMock.mockResolvedValue({ id: "thread-1" });

    await touchChatThread("thread-1");

    expect(updateThreadMock).toHaveBeenCalledTimes(1);
    const call = updateThreadMock.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { updatedAt: Date };
    };
    expect(call.where).toEqual({ id: "thread-1" });
    expect(call.data.updatedAt).toBeInstanceOf(Date);
  });
});
