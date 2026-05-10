import { beforeEach, describe, expect, test, vi } from "vitest";
import { Role } from "@/generated/prisma/client";

const { authMock, deleteManyMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  deleteManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { findUnique: findUniqueMock },
    teacherRosterEntry: { deleteMany: deleteManyMock },
  },
}));

import { DELETE } from "../[entryId]/route";

describe("DELETE /api/teacher/roster/[entryId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "tu-1", role: Role.TEACHER } });
    findUniqueMock.mockResolvedValue({ id: "tp-1" });
  });

  test("returns 404 when entry does not belong to teacher", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    const res = await DELETE(
      new Request("http://localhost/api/teacher/roster/e-missing"),
      { params: Promise.resolve({ entryId: "e-missing" }) },
    );
    expect(res.status).toBe(404);
  });

  test("deletes roster entry for this teacher", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });
    const res = await DELETE(
      new Request("http://localhost/api/teacher/roster/e1"),
      { params: Promise.resolve({ entryId: "e1" }) },
    );
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "e1", teacherId: "tp-1" },
    });
  });
});
