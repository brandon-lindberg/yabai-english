import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/teacher/invoices/export/route";

describe("GET /api/teacher/invoices/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        invoiceNo: "INV-1",
        amountYen: 3300,
        student: { name: "Student S", email: "s@example.com" },
        booking: {
          startsAt: new Date("2026-05-10T15:00:00.000Z"),
          lessonProduct: { nameJa: "初級", nameEn: "Beginner", durationMin: 30 },
          teacher: { user: { name: "Teacher T", email: "t@example.com" } },
        },
      },
    ]);
  });

  test("returns CSV for all students", async () => {
    const res = await GET(new Request("http://localhost/api/teacher/invoices/export?studentId=all"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("Invoice number");
    expect(body).toContain("INV-1");
    expect(body).toContain("Teacher T");
    expect(body).toContain("Student S");
    expect(body).toContain("初級 / Beginner");
    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          booking: { teacherId: "tp-1" },
        }),
      }),
    );
  });

  test("filters by student when studentId is set", async () => {
    await GET(new Request("http://localhost/api/teacher/invoices/export?studentId=stu-99"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: "stu-99",
        }),
      }),
    );
  });

  test("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/teacher/invoices/export"));
    expect(res.status).toBe(401);
  });
});
