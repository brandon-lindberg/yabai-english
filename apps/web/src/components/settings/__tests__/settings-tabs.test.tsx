// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { SettingsTabs } from "@/components/settings/settings-tabs";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("SettingsTabs", () => {
  test("renders settings-specific tabs for teachers", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SettingsTabs activeTab="payments" showPayments />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("navigation", { name: en.dashboard.settingsPage.tabsAriaLabel })).toBeTruthy();
    expect(screen.getByRole("link", { name: en.dashboard.settingsPage.tabPayments })).toHaveAttribute(
      "href",
      "/dashboard/settings?tab=payments",
    );
    expect(screen.getByRole("link", { name: en.dashboard.settingsPage.tabGoogle })).toHaveAttribute(
      "href",
      "/dashboard/settings?tab=google",
    );
  });
});
