import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findUniqueMock, ensureMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  ensureMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { booking: { findUnique: findUniqueMock } } }));
vi.mock("@/lib/ensure-invoice", () => ({ ensureInvoiceForPaidBooking: ensureMock }));

import { GET } from "@/app/api/bookings/[bookingId]/invoice/route";

function get(bookingId = "b-1", lang = "en") {
  return GET(new Request(`http://localhost/api/bookings/${bookingId}/invoice?lang=${lang}`), {
    params: Promise.resolve({ bookingId }),
  });
}

describe("GET /api/bookings/[bookingId]/invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "s-1" } });
    findUniqueMock.mockResolvedValue({
      id: "b-1",
      studentId: "s-1",
      teacher: { userId: "t-1" },
    });
    ensureMock.mockResolvedValue({ id: "inv-1", invoiceNo: "INV-1", paidAt: new Date() });
  });

  test("hands off to the one route that builds the PDF", async () => {
    const res = await get("b-1", "ja");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/api/invoices/inv-1/pdf?lang=ja");
  });

  test("the owning teacher may fetch it too", async () => {
    authMock.mockResolvedValue({ user: { id: "t-1" } });

    expect((await get()).status).toBe(307);
  });

  test("nobody else may", async () => {
    // The invoice names the student and what they paid.
    authMock.mockResolvedValue({ user: { id: "someone-else" } });

    expect((await get()).status).toBe(404);
  });

  test("an unpaid booking has no invoice to give", async () => {
    ensureMock.mockResolvedValue(null);

    expect((await get()).status).toBe(404);
  });

  test("a signed-out request is refused", async () => {
    authMock.mockResolvedValue(null);

    expect((await get()).status).toBe(401);
  });
});
