import { beforeEach, describe, expect, test, vi } from "vitest";
import { Role } from "@/generated/prisma/client";

const { authMock, updateManyMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  updateManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { findUnique: findUniqueMock },
    teacherRosterEntry: { updateMany: updateManyMock, deleteMany: vi.fn() },
  },
}));

import { PATCH } from "../[entryId]/route";

function patch(body: unknown, entryId = "e1") {
  return PATCH(
    new Request(`http://localhost/api/teacher/roster/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ entryId }) },
  );
}

describe("PATCH /api/teacher/roster/[entryId] — archiving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "tu-1", role: Role.TEACHER } });
    findUniqueMock.mockResolvedValue({ id: "tp-1" });
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  test("archiving stamps a time rather than deleting anything", async () => {
    // Archiving must stay reversible: the teacher's history, invoices and notes
    // for this student all remain.
    const res = await patch({ archived: true });

    expect(res.status).toBe(200);
    const where = updateManyMock.mock.calls[0][0].where;
    const data = updateManyMock.mock.calls[0][0].data;
    expect(where).toMatchObject({ id: "e1", teacherId: "tp-1" });
    expect(data.archivedAt).toBeInstanceOf(Date);
  });

  test("un-archiving clears the stamp", async () => {
    const res = await patch({ archived: false });

    expect(res.status).toBe(200);
    expect(updateManyMock.mock.calls[0][0].data).toEqual({ archivedAt: null });
  });

  test("scopes the update to the caller's own roster", async () => {
    // Without the teacherId in the where clause, any teacher could archive a
    // student off another teacher's roster by guessing an id.
    await patch({ archived: true });

    expect(updateManyMock.mock.calls[0][0].where.teacherId).toBe("tp-1");
  });

  test("returns 404 when the entry is not on the caller's roster", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    expect((await patch({ archived: true })).status).toBe(404);
  });

  test("rejects a body that does not say what to do", async () => {
    expect((await patch({})).status).toBe(400);
    expect((await patch({ archived: "yes" })).status).toBe(400);
  });

  test("rejects callers outside the teacher cabinet", async () => {
    authMock.mockResolvedValue({ user: { id: "s-1", role: Role.STUDENT } });

    expect((await patch({ archived: true })).status).toBe(401);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  test("allows SUPER_ADMIN, like the rest of the cabinet", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: Role.SUPER_ADMIN } });

    expect((await patch({ archived: true })).status).toBe(200);
  });

  test("404s when the caller has no teacher profile", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect((await patch({ archived: true })).status).toBe(404);
  });
});
