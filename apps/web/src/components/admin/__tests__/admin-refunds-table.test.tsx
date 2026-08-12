// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { AdminRefundsTable } from "@/components/admin/admin-refunds-table";

function renderTable() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminRefundsTable />
    </NextIntlClientProvider>,
  );
}

const stuckRefund = {
  id: "refund-1",
  status: "PENDING_RECOVERY",
  amountYen: 5000,
  actor: "STUDENT",
  reason: "CANCELLATION_POLICY",
  recoveryNote: "Application fee refund failed and must be issued manually: no balance",
  providerRefundId: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  bookingId: "booking-1",
  lessonStartsAt: "2026-08-05T00:00:00.000Z",
  student: { id: "student-1", name: "Aki", email: "aki@example.com" },
  teacher: { id: "teacher-1", name: "Sam", email: "sam@example.com" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminRefundsTable", () => {
  test("shows the people, the amount and why it is stuck", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [stuckRefund] }) }),
    );

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Aki")).toBeTruthy();
    });
    expect(screen.getByText("Sam")).toBeTruthy();
    expect(screen.getByText("¥5,000")).toBeTruthy();
    expect(screen.getByText(/must be issued manually/)).toBeTruthy();
    expect(
      screen.getByText(en.admin.refundsPage.statusPendingRecovery),
    ).toBeTruthy();
  });

  test("says so when nothing needs attention", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }),
    );

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(en.admin.refundsPage.empty)).toBeTruthy();
    });
  });

  test("surfaces a failed load as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Forbidden" }) }),
    );

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });
});
