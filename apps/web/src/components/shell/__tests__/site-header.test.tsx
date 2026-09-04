// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { SiteHeader } from "@/components/shell/site-header";

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(() => ({
    status: "authenticated",
    data: { user: { role: "TEACHER", canStartPlacement: false, activeOrgId: null } },
  })),
}));

vi.mock("@/hooks/use-verified-session", () => ({
  useVerifiedSession: () => sessionMock(),
}));

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
vi.mock("next-auth/react", () => ({ signOut: vi.fn(), useSession: () => ({ data: null }) }));

/*
  The wordmark sat 12px from "Dashboard" while the nav separated its own links
  by 24px — so the name of the product was closer to the first nav item than
  the nav items were to each other, and read as the first thing in the menu
  rather than as the masthead.

  It cannot move further left: it is already flush with the page gutter, in
  line with every heading below it. So the separation is what changes.
*/

describe("SiteHeader", () => {
  // The mock's return value persists between tests; without this a signed-out
  // case leaks into every test after it.
  beforeEach(() => {
    sessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { role: "TEACHER", canStartPlacement: false, activeOrgId: null } },
    });
  });

  test("shows the wordmark", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: en.common.appName })).toBeInTheDocument();
  });

  test("sets the wordmark apart from the nav it sits beside", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    // More than the `gap-6` the nav uses between its own links, or the
    // masthead reads as one of them.
    expect(screen.getByRole("link", { name: en.common.appName }).className).toMatch(
      /\bmd:mr-(8|10|12|14|16)\b/,
    );
  });

  test("offers the teaching page to a visitor who has not signed in", () => {
    // Teaching is by invitation, so the page explaining that is for people
    // without an account. It has nothing to say to anyone already inside.
    sessionMock.mockReturnValue({ status: "unauthenticated", data: null } as never);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getAllByRole("link", { name: en.common.becomeTeacher }).length,
    ).toBeGreaterThan(0);
  });

  test("does not offer it to somebody already signed in", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole("link", { name: en.common.becomeTeacher })).toBeNull();
  });
});
