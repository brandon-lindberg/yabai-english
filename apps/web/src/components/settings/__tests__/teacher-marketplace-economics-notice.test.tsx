// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherMarketplaceEconomicsNotice } from "@/components/settings/teacher-marketplace-economics-notice";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("TeacherMarketplaceEconomicsNotice", () => {
  test("renders tier and refund copy with legal doc links", () => {
    const messages = en.dashboard.settingsPage.marketplaceEconomics;

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherMarketplaceEconomicsNotice />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(messages.title)).toBeTruthy();
    expect(screen.getByText(messages.refundTeacherCancel)).toBeTruthy();
    expect(screen.getByRole("link", { name: messages.refundDocsTeacherTermsLink })).toHaveAttribute(
      "href",
      "/legal/terms/teachers",
    );
    expect(screen.getByRole("link", { name: messages.refundDocsRefundLink })).toHaveAttribute(
      "href",
      "/legal/refund/teachers",
    );
  });
});
