import { afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Unread counts are grouped in one query, not counted per thread.
 *
 * This runs against real Postgres because a Prisma `groupBy` typechecks
 * whatever the database thinks of it — the same reason the filtered relation
 * `_count` on group sessions is exercised here rather than only in a mock.
 * The behaviour that matters and cannot be seen from a mock is the shape of
 * what comes back: a thread with nothing unread produces **no row at all**,
 * which is why the route falls back to zero rather than reading a key.
 */
const TAG = `chat-unread-${Date.now()}`;
const created = { userIds: [] as string[], teacherProfileId: "" };

describe.skipIf(!process.env.DATABASE_URL)("grouped unread counts", () => {
  afterAll(async () => {
    await prisma.chatMessage.deleteMany({ where: { body: { startsWith: TAG } } });
    await prisma.chatThread.deleteMany({ where: { studentId: { in: created.userIds } } });
    if (created.teacherProfileId) {
      await prisma.teacherProfile.deleteMany({ where: { id: created.teacherProfileId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  });

  test("returns one row per thread that has unread messages, and none for the rest", async () => {
    const student = await prisma.user.create({
      data: { email: `${TAG}-s@example.com`, name: "S", role: "STUDENT" },
    });
    // Two teachers, because a student and a teacher share at most one thread.
    const teacher = await prisma.user.create({
      data: { email: `${TAG}-t@example.com`, name: "T", role: "TEACHER" },
    });
    const otherTeacher = await prisma.user.create({
      data: { email: `${TAG}-t2@example.com`, name: "T2", role: "TEACHER" },
    });
    created.userIds.push(student.id, teacher.id, otherTeacher.id);

    const withUnread = await prisma.chatThread.create({
      data: { studentId: student.id, teacherId: teacher.id },
    });
    const withoutUnread = await prisma.chatThread.create({
      data: { studentId: student.id, teacherId: otherTeacher.id },
    });

    await prisma.chatMessage.createMany({
      data: [
        {
          threadId: withUnread.id,
          senderId: teacher.id,
          recipientId: student.id,
          body: `${TAG} one`,
        },
        {
          threadId: withUnread.id,
          senderId: teacher.id,
          recipientId: student.id,
          body: `${TAG} two`,
        },
        {
          threadId: withoutUnread.id,
          senderId: otherTeacher.id,
          recipientId: student.id,
          body: `${TAG} read`,
          readAt: new Date(),
        },
      ],
    });

    const rows = await prisma.chatMessage.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: [withUnread.id, withoutUnread.id] },
        recipientId: student.id,
        readAt: null,
      },
      _count: { _all: true },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].threadId).toBe(withUnread.id);
    expect(rows[0]._count._all).toBe(2);
  });

  test("an empty id list is safe rather than an error", async () => {
    // The route builds the list from the threads it found; a viewer with none
    // must not blow up the request.
    const rows = await prisma.chatMessage.groupBy({
      by: ["threadId"],
      where: { threadId: { in: [] } },
      _count: { _all: true },
    });

    expect(rows).toEqual([]);
  });
});
