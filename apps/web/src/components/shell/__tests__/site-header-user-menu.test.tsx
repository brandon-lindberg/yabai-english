// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { SiteHeaderUserMenu } from "@/components/shell/site-header-user-menu";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/en/dashboard",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

/*
  The account menu is for the things with nowhere else to live — language, the
  theme, signing out. Profile had a tab of its own in the dashboard sub-nav, so
  the menu was offering a second door to a room already on the wall.
*/

function renderMenu(role = "TEACHER") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SiteHeaderUserMenu role={role} />
    </NextIntlClientProvider>,
  );
}

describe("SiteHeaderUserMenu", () => {
  test("does not offer Profile, which has its own tab", () => {
    renderMenu();

    expect(screen.queryByRole("link", { name: en.common.profile })).toBeNull();
  });

  test("still offers the things that live nowhere else", () => {
    renderMenu();

    expect(screen.getByRole("link", { name: en.common.settings })).toBeInTheDocument();
    expect(screen.getByText(en.common.signOut)).toBeInTheDocument();
  });
});
