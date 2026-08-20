// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { CheckoutPayButton } from "@/components/checkout-pay-button";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("CheckoutPayButton", () => {
  test("renders checkout terms with legal links", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <CheckoutPayButton bookingId="booking-1" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: "Student Marketplace Terms" })).toHaveAttribute(
      "href",
      "/legal/terms/students",
    );
    expect(screen.getByRole("link", { name: "Student Refund Policy" })).toHaveAttribute(
      "href",
      "/legal/refund/students",
    );
  });
});
