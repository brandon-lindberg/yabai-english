import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, setOverrideMock, removeOverrideMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
  },
  setOverrideMock: vi.fn(),
  removeOverrideMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/teacher-tiers", () => ({
  setTeacherTierOverride: setOverrideMock,
  removeTeacherTierOverride: removeOverrideMock,
}));

import {
  DELETE,
  POST,
} from "@/app/api/admin/teacher-tiers/[teacherId]/override/route";

describe("/api/admin/teacher-tiers/[teacherId]/override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "teacher-1" });
  });

  test("allows SUPER_ADMIN to set an indefinite tier override without a note", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/teacher-tiers/teacher-1/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "TIER_3" }),
      }),
      { params: Promise.resolve({ teacherId: "teacher-1" }) },
    );

    expect(res.status).toBe(200);
    expect(setOverrideMock).toHaveBeenCalledWith(expect.anything(), {
      teacherId: "teacher-1",
      tier: "TIER_3",
      actorUserId: "admin-1",
      note: null,
      expiresAt: null,
    });
  });

  test("rejects non-admin override requests", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });

    const res = await POST(
      new Request("http://localhost/api/admin/teacher-tiers/teacher-1/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "TIER_2" }),
      }),
      { params: Promise.resolve({ teacherId: "teacher-1" }) },
    );

    expect(res.status).toBe(401);
    expect(setOverrideMock).not.toHaveBeenCalled();
  });

  test("allows SUPER_ADMIN to remove an override", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/admin/teacher-tiers/teacher-1/override", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ teacherId: "teacher-1" }) },
    );

    expect(res.status).toBe(200);
    expect(removeOverrideMock).toHaveBeenCalledWith(expect.anything(), {
      teacherId: "teacher-1",
      actorUserId: "admin-1",
    });
  });
});
