import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    chatThread: {
      findMany: vi.fn(),
    },
    chatMessage: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    teacherProfile: {
      findMany: vi.fn(),
    },
    booking: {
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

vi.mock("@/lib/chat-blocking", () => ({
  isViewerBlockedByCounterpart: () => false,
}));

import { GET } from "@/app/api/chat/threads/route";

describe("GET /api/chat/threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.teacherProfile.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.groupBy.mockResolvedValue([]);
  });

  function adminCounterpartThread(twoWayEnabled: boolean) {
    return {
      id: "admin-thread",
      studentId: "admin-1",
      teacherId: "teach-1",
      twoWayEnabled,
      studentBlockedAt: null,
      teacherBlockedAt: null,
      studentReportedAt: null,
      teacherReportedAt: null,
      studentReportReason: null,
      teacherReportReason: null,
      student: { name: "Admin", email: null, role: "SUPER_ADMIN" },
      teacher: { name: "Mika", email: null, role: "TEACHER", teacherProfile: null },
      messages: [],
    };
  }

  test("admin counterpartName lists student and teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
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
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
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
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
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

  test("admin unread count only includes messages addressed to the admin", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
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
        student: { name: "Stu One", email: null },
        teacher: { name: "Tea One", email: null, teacherProfile: null },
        messages: [{ body: "Hi", createdAt: new Date() }],
      },
    ]);
    // Thread-level unread (someone else's) is 3, admin-addressed unread is 0.
    /*
      Same fixture, expressed as grouped rows rather than per-thread counts:
      nothing is addressed to the admin, and three messages are unread between
      the participants. The distinction this test exists for — the admin's own
      badge versus the moderation queue's — is unchanged.
    */
    prismaMock.chatMessage.groupBy.mockImplementation(
      async ({ where }: { where: { recipientId?: string } }) =>
        where.recipientId === "admin-1"
          ? []
          : [{ threadId: "participant-unread", _count: { _all: 3 } }],
    );

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { unreadCount: number }[];
    expect(data[0]?.unreadCount).toBe(0);
  });

  test("admin queue=unread still surfaces threads unread by their participants", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "participant-unread",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Stu One", email: null },
        teacher: { name: "Tea One", email: null, teacherProfile: null },
        messages: [{ body: "Hi", createdAt: new Date() }],
      },
    ]);
    /*
      Same fixture, expressed as grouped rows rather than per-thread counts:
      nothing is addressed to the admin, and three messages are unread between
      the participants. The distinction this test exists for — the admin's own
      badge versus the moderation queue's — is unchanged.
    */
    prismaMock.chatMessage.groupBy.mockImplementation(
      async ({ where }: { where: { recipientId?: string } }) =>
        where.recipientId === "admin-1"
          ? []
          : [{ threadId: "participant-unread", _count: { _all: 3 } }],
    );

    const res = await GET(
      new Request("http://localhost/api/chat/threads?queue=unread"),
    );
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { id: string; unreadCount: number }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe("participant-unread");
    expect(data[0]?.unreadCount).toBe(0);
  });

  test("scopes a non-admin to threads they participate in, in either slot", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/chat/threads"));

    expect(prismaMock.chatThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ studentId: "teach-1" }, { teacherId: "teach-1" }] },
      }),
    );
  });

  test("previews only the latest message the viewer is party to", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/chat/threads"));

    expect(prismaMock.chatThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          messages: expect.objectContaining({
            where: { OR: [{ senderId: "teach-1" }, { recipientId: "teach-1" }] },
          }),
        }),
      }),
    );
  });

  test("previews the whole thread for a moderating admin", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    prismaMock.chatThread.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/chat/threads"));

    const call = prismaMock.chatThread.findMany.mock.calls[0]?.[0] as {
      include: { messages: { where?: unknown } };
    };
    expect(call.include.messages.where).toBeUndefined();
  });

  test("shows a student the generic admin label, not the admin's name", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "admin-thread",
        studentId: "stu-1",
        teacherId: "admin-1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Dwight", email: null, role: "STUDENT" },
        teacher: {
          name: "Brandon Lindberg",
          email: "brandon@test.com",
          role: "SUPER_ADMIN",
          teacherProfile: null,
        },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const body = await res.text();
    const data = JSON.parse(body) as {
      counterpartName: string | null;
      counterpartIsAdmin: boolean;
      teacherName: string | null;
      teacherIsAdmin: boolean;
    }[];

    expect(data[0]?.counterpartIsAdmin).toBe(true);
    expect(data[0]?.teacherIsAdmin).toBe(true);
    expect(data[0]?.counterpartName).toBeNull();
    expect(data[0]?.teacherName).toBeNull();
    // The admin's personal name must not reach the recipient at all.
    expect(body).not.toContain("Brandon Lindberg");
    expect(body).not.toContain("brandon@test.com");
  });

  test("shows a teacher the generic admin label when the admin holds the student slot", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "admin-thread",
        studentId: "admin-1",
        teacherId: "teach-1",
        twoWayEnabled: true,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Brandon Lindberg", email: null, role: "SUPER_ADMIN" },
        teacher: { name: "Mika", email: null, role: "TEACHER", teacherProfile: null },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const body = await res.text();
    const data = JSON.parse(body) as {
      counterpartIsAdmin: boolean;
      studentName: string | null;
    }[];

    expect(data[0]?.counterpartIsAdmin).toBe(true);
    expect(data[0]?.studentName).toBeNull();
    expect(body).not.toContain("Brandon Lindberg");
  });

  test("keeps real names for non-admin counterparts", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
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
        student: { name: "Dwight", email: null, role: "STUDENT" },
        teacher: {
          name: "Mika Sato",
          email: null,
          role: "TEACHER",
          teacherProfile: { displayName: "Ms. Mika" },
        },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as {
      counterpartName: string | null;
      counterpartIsAdmin: boolean;
    }[];
    expect(data[0]?.counterpartIsAdmin).toBe(false);
    expect(data[0]?.counterpartName).toBe("Ms. Mika");
  });

  test("tells a teacher they cannot reply while the admin has replies closed", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([adminCounterpartThread(false)]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { viewerCanSend: boolean }[];
    expect(data[0]?.viewerCanSend).toBe(false);
  });

  test("tells a teacher they can reply once the admin opens replies", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([adminCounterpartThread(true)]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { viewerCanSend: boolean }[];
    expect(data[0]?.viewerCanSend).toBe(true);
  });

  test("a teacher can always write to their own student", async () => {
    authMock.mockResolvedValue({ user: { id: "teach-1", role: "TEACHER" } });
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: "student-thread",
        studentId: "stu-1",
        teacherId: "teach-1",
        twoWayEnabled: false,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        student: { name: "Dwight", email: null, role: "STUDENT" },
        teacher: { name: "Mika", email: null, role: "TEACHER", teacherProfile: null },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { viewerCanSend: boolean }[];
    expect(data[0]?.viewerCanSend).toBe(true);
  });

  test("a student with two-way on but no booked lesson still cannot write", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
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
        student: { name: "Dwight", email: null, role: "STUDENT" },
        teacher: { name: "Mika", email: null, role: "TEACHER", teacherProfile: null },
        messages: [],
      },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(0);
    prismaMock.teacherProfile.findMany.mockResolvedValue([
      { id: "profile-1", userId: "teach-1" },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res) throw new Error("expected response");
    const data = (await res.json()) as { viewerCanSend: boolean }[];
    expect(data[0]?.viewerCanSend).toBe(false);

    prismaMock.booking.findMany.mockResolvedValue([{ teacherId: "profile-1" }]);
    const res2 = await GET(new Request("http://localhost/api/chat/threads"));
    if (!res2) throw new Error("expected response");
    const data2 = (await res2.json()) as { viewerCanSend: boolean }[];
    expect(data2[0]?.viewerCanSend).toBe(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
});

describe("GET /api/chat/threads — one query, not one per thread", () => {
  /*
    Unread counts were fetched with a `count` inside the per-thread map: two
    round-trips per row for an admin, one for everyone else. It is invisible on
    a test account and grows with exactly the person who has the most threads —
    a busy teacher, or an admin looking at the moderation queue.

    The assertion is on the shape rather than the timing: the number of queries
    must not depend on the number of threads.
  */
  function thread(id: string) {
    return {
      id,
      studentId: "s-1",
      teacherId: "t-1",
      twoWayEnabled: true,
      studentBlockedAt: null,
      teacherBlockedAt: null,
      studentReportedAt: null,
      teacherReportedAt: null,
      studentReportReason: null,
      teacherReportReason: null,
      student: { name: "Aiko", email: null, role: "STUDENT" },
      teacher: { name: "Mika", email: null, role: "TEACHER", teacherProfile: null },
      messages: [],
    };
  }

  async function queriesFor(count: number) {
    vi.clearAllMocks();
    prismaMock.teacherProfile.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.groupBy.mockResolvedValue([]);
    authMock.mockResolvedValue({ user: { id: "s-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue(
      Array.from({ length: count }, (_, i) => thread(`th-${i}`)),
    );

    await GET(new Request("http://localhost/api/chat/threads"));

    return (
      prismaMock.chatMessage.count.mock.calls.length +
      prismaMock.chatMessage.groupBy.mock.calls.length
    );
  }

  test("counting unread does not scale with the thread count", async () => {
    const forOne = await queriesFor(1);
    const forTwenty = await queriesFor(20);

    expect(forTwenty).toBe(forOne);
  });

  test("a thread with no unread messages still reports zero", async () => {
    // `groupBy` returns no row at all for a thread with nothing unread, so the
    // absent key has to read as 0 rather than undefined.
    vi.clearAllMocks();
    prismaMock.teacherProfile.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.chatMessage.groupBy.mockResolvedValue([]);
    authMock.mockResolvedValue({ user: { id: "s-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue([thread("th-0")]);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    const body = (await res.json()) as Array<{ unreadCount: number }>;

    expect(body[0].unreadCount).toBe(0);
  });

  test("a thread with unread messages reports its own count", async () => {
    vi.clearAllMocks();
    prismaMock.teacherProfile.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    authMock.mockResolvedValue({ user: { id: "s-1", role: "STUDENT" } });
    prismaMock.chatThread.findMany.mockResolvedValue([thread("th-0"), thread("th-1")]);
    prismaMock.chatMessage.groupBy.mockResolvedValue([
      { threadId: "th-1", _count: { _all: 3 } },
    ]);

    const res = await GET(new Request("http://localhost/api/chat/threads"));
    const body = (await res.json()) as Array<{ id: string; unreadCount: number }>;

    expect(body.find((t) => t.id === "th-1")?.unreadCount).toBe(3);
    expect(body.find((t) => t.id === "th-0")?.unreadCount).toBe(0);
  });
});

