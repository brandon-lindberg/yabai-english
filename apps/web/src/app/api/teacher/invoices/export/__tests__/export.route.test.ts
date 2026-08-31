import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    refund: { findMany: vi.fn() },
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
    prismaMock.payment.findMany.mockResolvedValue([
      { bookingId: "booking-1", method: "CARD" },
    ]);
    prismaMock.refund.findMany.mockResolvedValue([]);
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        invoiceNo: "INV-1",
        bookingId: "booking-1",
        amountYen: 3300,
        paidAt: new Date("2026-04-28T02:00:00.000Z"),
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

  test("carries each invoice's transaction type", async () => {
    const res = await GET(
      new Request("http://localhost/api/teacher/invoices/export?studentId=all"),
    );
    const body = await res.text();

    expect(body).toContain("Payment method");
    expect(body).toContain("Credit card");
  });

  test("looks payments up in one query rather than one per invoice", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        invoiceNo: "INV-1",
        bookingId: "booking-1",
        amountYen: 3300,
        paidAt: new Date("2026-04-28T02:00:00.000Z"),
        student: { name: "Student S", email: "s@example.com" },
        booking: {
          startsAt: new Date("2026-05-10T15:00:00.000Z"),
          lessonProduct: { nameJa: "初級", nameEn: "Beginner", durationMin: 30 },
          teacher: { user: { name: "Teacher T", email: "t@example.com" } },
        },
      },
      {
        invoiceNo: "INV-2",
        bookingId: "booking-2",
        amountYen: 5500,
        paidAt: new Date("2026-04-29T02:00:00.000Z"),
        student: { name: "Student Z", email: "z@example.com" },
        booking: {
          startsAt: new Date("2026-05-11T15:00:00.000Z"),
          lessonProduct: { nameJa: "中級", nameEn: "Intermediate", durationMin: 50 },
          teacher: { user: { name: "Teacher T", email: "t@example.com" } },
        },
      },
    ]);
    prismaMock.payment.findMany.mockResolvedValue([
      { bookingId: "booking-2", method: "PAYPAY" },
    ]);

    const res = await GET(
      new Request("http://localhost/api/teacher/invoices/export?studentId=all"),
    );
    const body = await res.text();

    expect(prismaMock.payment.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: { in: ["booking-1", "booking-2"] } },
      }),
    );
    const [, row1, row2] = body.split("\r\n");
    // INV-1 has no payment row; INV-2 does. Each must get its own answer.
    // Six empty refund cells follow the payment method on an unrefunded row.
    expect(row1!.endsWith(",,,,,,,")).toBe(true);
    expect(row2!.endsWith(",PayPay,,,,,,")).toBe(true);
  });

  test("carries the payment date alongside the lesson date", async () => {
    const res = await GET(
      new Request("http://localhost/api/teacher/invoices/export?studentId=all"),
    );
    const body = await res.text();

    expect(body).toContain("Payment date (Asia/Tokyo)");
    // Lesson ran on the 11th Tokyo time; it was paid on the 28th of April.
    expect(body).toContain(",2026-05-11,2026-04-28,");
  });

  test("a refunded lesson carries its credit note and negative amounts", async () => {
    prismaMock.refund.findMany.mockResolvedValue([
      {
        bookingId: "booking-1",
        creditNoteNo: "CRN-1",
        amountYen: 3300,
        status: "SUCCEEDED",
        createdAt: new Date("2026-05-12T02:00:00.000Z"),
      },
    ]);

    const res = await GET(
      new Request("http://localhost/api/teacher/invoices/export?studentId=all"),
    );
    const body = await res.text();

    expect(body).toContain("Credit note number");
    // The sale stays at full value and the return sits beside it, negative.
    expect(body).toContain(",3000,300,3300,Credit card,CRN-1,2026-05-12,SUCCEEDED,-3000,-300,-3300");
  });

  test("looks refunds up in one query rather than one per invoice", async () => {
    await GET(new Request("http://localhost/api/teacher/invoices/export?studentId=all"));

    expect(prismaMock.refund.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.refund.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookingId: { in: ["booking-1"] } } }),
    );
  });
});
