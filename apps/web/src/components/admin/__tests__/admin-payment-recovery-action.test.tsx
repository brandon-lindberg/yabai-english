// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { AdminPaymentRecoveryAction } from "../admin-payment-recovery-action";
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => vi.unstubAllGlobals());
test("fee-only recovery requires a confirmation that makes the already-refunded student clear", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: "COMPLETE" }) });vi.stubGlobal("fetch", fetch);
  const done = vi.fn();render(<NextIntlClientProvider locale="en" messages={en}><AdminPaymentRecoveryAction paymentId="payment" feeOnly onCompleted={done} /></NextIntlClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: en.admin.refundsPage.retryRecovery }));expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(en.admin.refundsPage.feeRecoveryConfirm)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: en.admin.refundsPage.confirmRecovery }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledWith("/api/admin/payments/recovery", expect.objectContaining({ method: "POST", body: JSON.stringify({ paymentId: "payment", feeOnly: true }) }));
});
test("a failed retry keeps a readable error and allows another explicit attempt", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
  render(<NextIntlClientProvider locale="en" messages={en}><AdminPaymentRecoveryAction eventId="event" onCompleted={vi.fn()} /></NextIntlClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: en.admin.refundsPage.retryEvent }));
  fireEvent.click(screen.getByRole("button", { name: en.admin.refundsPage.confirmRecovery }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(en.admin.refundsPage.recoveryError));
  expect(screen.getByRole("button", { name: en.admin.refundsPage.confirmRecovery })).toBeEnabled();
});
