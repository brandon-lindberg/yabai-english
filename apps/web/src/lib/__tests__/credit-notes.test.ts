import { beforeEach, describe, expect, test, vi } from "vitest";

const { findRefundMock, updateRefundMock } = vi.hoisted(() => ({
  findRefundMock: vi.fn(),
  updateRefundMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { refund: { findUnique: findRefundMock, update: updateRefundMock } },
}));

import { buildCreditNoteNumber, ensureCreditNoteNumber } from "@/lib/credit-notes";

describe("buildCreditNoteNumber", () => {
  test("is recognisable as a credit note and sorts with invoices", () => {
    const no = buildCreditNoteNumber(new Date("2026-09-01T10:15:00Z"));
    expect(no).toMatch(/^CRN-20260901-101500-[0-9A-Z]{4}$/);
  });
});

describe("ensureCreditNoteNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRefundMock.mockImplementation(async ({ data }) => ({ creditNoteNo: data.creditNoteNo }));
  });

  test("issues a number once a refund has actually succeeded", async () => {
    findRefundMock.mockResolvedValue({ id: "r1", status: "SUCCEEDED", creditNoteNo: null });

    const no = await ensureCreditNoteNumber("r1");

    expect(no).toMatch(/^CRN-/);
    expect(updateRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" } }),
    );
  });

  test("issues nothing while the money has not moved", async () => {
    for (const status of ["PENDING", "FAILED", "PENDING_RECOVERY"] as const) {
      findRefundMock.mockResolvedValue({ id: "r1", status, creditNoteNo: null });
      expect(await ensureCreditNoteNumber("r1")).toBeNull();
    }
    expect(updateRefundMock).not.toHaveBeenCalled();
  });

  test("never reissues — a credit note number is the document's identity", async () => {
    findRefundMock.mockResolvedValue({ id: "r1", status: "SUCCEEDED", creditNoteNo: "CRN-EXISTING" });

    expect(await ensureCreditNoteNumber("r1")).toBe("CRN-EXISTING");
    expect(updateRefundMock).not.toHaveBeenCalled();
  });

  test("does nothing for a refund that is not there", async () => {
    findRefundMock.mockResolvedValue(null);
    expect(await ensureCreditNoteNumber("missing")).toBeNull();
  });
});
