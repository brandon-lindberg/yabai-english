import { beforeEach, describe, expect, test, vi } from "vitest";

const { findUniqueMock, createMock, paymentFindMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  paymentFindMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: { findUnique: findUniqueMock },
    invoice: { create: createMock },
    payment: { findUnique: paymentFindMock },
  },
}));

import { ensureInvoiceForPaidBooking } from "@/lib/ensure-invoice";

/*
  A lesson that was paid for is owed an invoice, and a lesson that was refunded
  is owed a credit note that reverses it. Both were missing for a real booking:
  ¥3,500 collected, ¥3,500 returned, and nothing the student could download for
  their records — while the *rebooking* of the same slot sat underneath with an
  invoice, which is what made it look like the refund had been invoiced.

  Issued on demand rather than backfilled by migration: the same shape as
  `ensureCreditNoteNumber`, which already mints a number the first time one is
  actually needed.
*/
describe("ensureInvoiceForPaidBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentFindMock.mockResolvedValue({ status: "SUCCEEDED" });
  });

  test("issues one for a paid booking that has none", async () => {
    findUniqueMock.mockResolvedValue({
      id: "b-1",
      studentId: "s-1",
      quotedPriceYen: 3500,
      invoice: null,
    });
    createMock.mockResolvedValue({ id: "inv-1", invoiceNo: "INV-1", paidAt: new Date() });

    const invoice = await ensureInvoiceForPaidBooking("b-1");

    expect(invoice).toMatchObject({ id: "inv-1", invoiceNo: "INV-1" });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookingId: "b-1", amountYen: 3500 }),
      }),
    );
  });

  test("keeps the one that already exists", async () => {
    // The number is the document's identity; a second would leave two
    // documents for one payment.
    findUniqueMock.mockResolvedValue({
      id: "b-1",
      studentId: "s-1",
      quotedPriceYen: 3500,
      invoice: { id: "inv-existing", invoiceNo: "INV-OLD", paidAt: new Date() },
    });

    const invoice = await ensureInvoiceForPaidBooking("b-1");

    expect(invoice).toMatchObject({ id: "inv-existing", invoiceNo: "INV-OLD" });
    expect(createMock).not.toHaveBeenCalled();
  });

  test("issues nothing where no money was taken", async () => {
    // A free trial, or a booking abandoned before checkout. An invoice for
    // ¥0 that nobody paid is a document that should not exist.
    paymentFindMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue({
      id: "b-1",
      studentId: "s-1",
      quotedPriceYen: 3500,
      invoice: null,
    });

    expect(await ensureInvoiceForPaidBooking("b-1")).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  test("issues nothing for a payment that did not succeed", async () => {
    paymentFindMock.mockResolvedValue({ status: "FAILED" });
    findUniqueMock.mockResolvedValue({
      id: "b-1",
      studentId: "s-1",
      quotedPriceYen: 3500,
      invoice: null,
    });

    expect(await ensureInvoiceForPaidBooking("b-1")).toBeNull();
  });

  test("is safe on a booking that does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(await ensureInvoiceForPaidBooking("nope")).toBeNull();
  });
});
