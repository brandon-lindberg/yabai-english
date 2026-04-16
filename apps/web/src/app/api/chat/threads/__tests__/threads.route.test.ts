import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    chatThread: {
      findMany: vi.fn(),
    },
    chatMessage: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/chat-blocking", () => ({
  isViewerBlockedByCounterpart: () => false,
}));

import { GET } from "@/app/api/chat/threads/route";

describe("GET /api/chat/threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("admin counterpartName lists student and teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "t1",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Dwight Schrute", email: "dwight@test.com" },
        teacher: {
          name: "Mika Sato",
          email: "mika@test.com",
          teacherProfile: { displayName: "Mika S." },
        },
        messages: [{ body: "Hi", createdAt: new Date() }],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    expect(res.status).toBe(200);
    const data = (await res.json()) as { counterpartName: string }[];
    expect(data[0]?.counterpartName).toBe("Dwight Schrute · Mika S.");
  });

  test("student sees teacher label only", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "t1",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: false,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Dwight", email: null },
        teacher: {
          name: "Mika Sato",
          email: null,
          teacherProfile: { displayName: "Ms. Mika" },
        },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { counterpartName: string }[];
    expect(data[0]?.counterpartName).toBe("Ms. Mika");
  });

  test("admin can filter by queue=reported", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "reported",
        studentId: "s1",
        teacherId: "t1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: new Date(),
        teacherReportedAt: null,
        studentReportReason: "spam",
        teacherReportReason: null,
        student: { name: "Stu One", email: null },
        teacher: { name: "Tea One", email: null, teacherProfile: null },
        messages: [],
      },
      {
        id: "normal",
        studentId: "s2",
        teacherId: "t2",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Stu Two", email: null },
        teacher: { name: "Tea Two", email: null, teacherProfile: null },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads?queue=reported"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { id: string }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe("reported");
  });

  test("admin search matches teacher email", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "th-email",
        studentId: "s1",
        teacherId: "t1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Student One", email: "student.one@test.com" },
        teacher: {
          name: "Teacher One",
          email: "teacher.one@test.com",
          teacherProfile: null,
        },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads?q=teacher.one@test.com"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { id: string }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe("th-email");
  });

  test("hides archived thread for current participant", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
    const now = new Date("2026-04-16T12:00:00.000Z");
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "archived",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: false,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        studentArchivedAt: now,
        teacherArchivedAt: null,
        student: { name: "Dwight", email: null },
        teacher: { name: "Mika", email: null, teacherProfile: null },
        messages: [{ body: "old", createdAt: new Date("2026-04-16T11:00:00.000Z") }],
      },
      {
        id: "visible",
        studentId: "stu-1",
        teacherId: "teach-2",
        twoWayEnabled: false,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        studentArchivedAt: null,
        teacherArchivedAt: null,
        student: { name: "Dwight", email: null },
        teacher: { name: "Ken", email: null, teacherProfile: null },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { id: string }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe("visible");
  });

  test("shows archived thread again when a new message arrives", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "reappeared",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: false,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        studentArchivedAt: new Date("2026-04-16T11:00:00.000Z"),
        teacherArchivedAt: null,
        student: { name: "Dwight", email: null },
        teacher: { name: "Mika", email: null, teacherProfile: null },
        messages: [{ body: "new message", createdAt: new Date("2026-04-16T11:30:00.000Z") }],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { id: string }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe("reappeared");
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});
