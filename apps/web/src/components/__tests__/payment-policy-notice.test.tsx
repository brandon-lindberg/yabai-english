// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";

describe("PaymentPolicyNotice", () => {
  test("explains teacher refund responsibility", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PaymentPolicyNotice audience="teacher" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(/responsible for the full refund amount/i)).toBeTruthy();
    expect(screen.getByText(/Tier 1 uses 20% for lessons 1-5/i)).toBeTruthy();
    expect(screen.getByText(/Tier 3 is a flat 10%/i)).toBeTruthy();
    expect(screen.getByText(/not refunded unless/i)).toBeTruthy();
  });

  test("explains student marketplace transaction terms", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PaymentPolicyNotice audience="student" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(/transaction is between you and the teacher/i)).toBeTruthy();
    expect(screen.getByText(/refund may fail or be delayed/i)).toBeTruthy();
    expect(screen.queryByText(/Tier 1 uses 20% for lessons 1-5/i)).toBeNull();
    expect(screen.queryByText(/platform fee depends on the teacher/i)).toBeNull();
  });
});
