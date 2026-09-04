// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { RefundedLessons } from "@/components/dashboard/refunded-lessons";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async () => {
    const messages = en.dashboard as unknown as Record<string, string>;
    return (key: string, values?: Record<string, string | number>) =>
      (messages[key] ?? key).replace(/\{(\w+)\}/g, (_m, name: string) =>
        String(values?.[name] ?? ""),
      );
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

/*
  A student cancelled a lesson, was refunded, then booked the same slot again
  and paid. Two bookings, same teacher, same time, same title — and the rows
  were indistinguishable: one said "Cancelled" and offered nothing at all,
  the other offered an invoice. So the invoice looked like it belonged to the
  refunded lesson.

  The refund is the one fact that only belongs to this row, and it was the one
  fact not shown.
*/

const booking = {
  id: "b-1",
  startsAt: new Date("2026-07-18T02:00:00.000Z"),
  endsAt: new Date("2026-07-18T02:30:00.000Z"),
  status: "CANCELLED" as const,
  lessonProduct: { nameJa: "\u82f1\u4f1a\u8a71", nameEn: "Conversation (Eikawa)" },
  invoice: null,
  refunds: [
    {
      id: "r-1",
      status: "SUCCEEDED" as const,
      creditNoteNo: null,
      amountYen: 3500,
      createdAt: new Date("2026-07-09T00:00:00.000Z"),
    },
  ],
};

async function renderList(overrides: Record<string, unknown> = {}) {
  return render(
    await RefundedLessons({
      refunded: [{ ...booking, ...overrides }],
      counterpartLabel: "Teacher",
      counterpartName: () => "Brandon Lindberg",
    } as never),
  );
}

describe("RefundedLessons", () => {
  test("offers both documents for a refunded lesson", async () => {
    /*
      The pair is the record: the invoice stands and the credit note reverses
      it, and Japanese consumption-tax bookkeeping wants both.

      They used to be offered only where the rows already existed. Neither did
      for a real refund — the invoice is written at one point in the booking
      flow this booking never passed through, and the credit note number is
      assigned by the refund path an out-of-band refund can miss — so the row
      offered nothing at all. Both are minted on demand at the download now, so
      the links are always there for a refund that succeeded.
    */
    await renderList();

    expect(screen.getByText(en.dashboard.downloadInvoiceEn)).toBeInTheDocument();
    expect(screen.getByText(en.dashboard.downloadCreditNoteEn)).toBeInTheDocument();
  });

  test("says how much came back", async () => {
    // Without it the row is only "Cancelled", which is indistinguishable from
    // the paid booking of the same slot sitting under Completed.
    await renderList();

    expect(screen.getByText(/3,500/)).toBeInTheDocument();
  });

  test("says a refund happened even with no document to show", async () => {
    // This refund predates credit notes: no invoice, no creditNoteNo, so the
    // row previously rendered nothing a student could act on or read.
    await renderList();

    expect(screen.getByText(new RegExp(en.dashboard.refundedAmount.split("{")[0].trim()))).toBeInTheDocument();
  });

  test("shows a refund that is still moving, and says so", async () => {
    /*
      Both parties want to watch a refund while it is in flight — the money has
      been promised and has not arrived. Listing only settled refunds hid the
      lesson during exactly that stretch.
    */
    await renderList({
      refunds: [{ id: "r-1", status: "PENDING", creditNoteNo: null, amountYen: 3500, createdAt: new Date() }],
    });

    expect(screen.getByText(/in progress/)).toBeInTheDocument();
  });

  test("offers no documents until the money has actually gone back", async () => {
    // An invoice reversed by a credit note that does not exist yet would be a
    // record of something that has not happened.
    await renderList({
      refunds: [{ id: "r-1", status: "PENDING", creditNoteNo: null, amountYen: 3500, createdAt: new Date() }],
    });

    expect(screen.queryByText(en.dashboard.downloadCreditNoteEn)).toBeNull();
    expect(screen.queryByText(en.dashboard.downloadInvoiceEn)).toBeNull();
  });

  test("says when a refund could not be completed", async () => {
    await renderList({
      refunds: [{ id: "r-1", status: "FAILED", creditNoteNo: null, amountYen: 3500, createdAt: new Date() }],
    });

    expect(screen.getByText(/could not be completed/)).toBeInTheDocument();
  });
});
