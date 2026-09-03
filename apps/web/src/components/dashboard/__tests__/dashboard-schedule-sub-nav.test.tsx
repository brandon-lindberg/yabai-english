// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { DashboardScheduleSubNav } from "../dashboard-schedule-sub-nav";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/en/dashboard/schedule"),
}));

vi.mock("@/i18n/navigation", () => ({
  // Spreads the rest, so `aria-current` reaches the anchor — a mock that drops
  // it would hide the very thing marking the active tab.
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => usePathnameMock(),
}));

function renderSubNav({ isTeacher = true }: { isTeacher?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardScheduleSubNav isTeacher={isTeacher} />
    </NextIntlClientProvider>,
  );
}

describe("DashboardScheduleSubNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/en/dashboard/schedule");
  });

  test("refunded lessons have an address of their own", () => {
    // They used to hang off the bottom of Upcoming, which is a list of what is
    // still ahead — a refunded lesson is neither upcoming nor completed, and
    // the credit note issued for it is reachable from nowhere else.
    renderSubNav();

    expect(
      screen.getByRole("link", { name: en.dashboard.schedulePage.subNavRefunded }),
    ).toHaveAttribute("href", "/dashboard/schedule/refunded");
  });

  test("a student can reach their refunds too", () => {
    // Both parties get a document out of a refund; only availability is the
    // teacher's alone.
    renderSubNav({ isTeacher: false });

    expect(
      screen.getByRole("link", { name: en.dashboard.schedulePage.subNavRefunded }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: en.dashboard.schedulePage.subNavAvailability }),
    ).toBeNull();
  });

  test("marks the refunded tab as the one you are on", () => {
    usePathnameMock.mockReturnValue("/en/dashboard/schedule/refunded");
    renderSubNav();

    // `aria-current`, not the class string: the inactive style carries a
    // `hover:text-foreground` that would satisfy a naive class assertion.
    expect(
      screen.getByRole("link", { name: en.dashboard.schedulePage.subNavRefunded }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("does not mistake the refunded tab for upcoming", () => {
    // `/dashboard/schedule` is a prefix of every tab's path, so the fallthrough
    // that decides "upcoming" has to be the last word, not the first.
    usePathnameMock.mockReturnValue("/en/dashboard/schedule/refunded");
    renderSubNav();

    expect(
      screen.getByRole("link", { name: en.dashboard.schedulePage.subNavUpcoming }),
    ).not.toHaveAttribute("aria-current");
  });
});
