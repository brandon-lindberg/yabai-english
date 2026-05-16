// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { DashboardSubNav } from "../dashboard-sub-nav";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/en/dashboard/lessons"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  usePathname: () => usePathnameMock(),
}));

describe("DashboardSubNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/en/dashboard/lessons");
  });

  test("shows a teacher lessons and rates tab", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardSubNav isTeacher />
      </NextIntlClientProvider>,
    );

    const lessonsLink = screen.getByRole("link", {
      name: en.dashboard.nav.lessons,
    });

    expect(lessonsLink).toHaveAttribute("href", "/dashboard/lessons");
    expect(lessonsLink.className).toContain("text-foreground");
  });

  test("shows students tab for teachers", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardSubNav isTeacher />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: en.dashboard.nav.students })).toHaveAttribute(
      "href",
      "/dashboard/students",
    );
  });

  test("shows invoices tab for teachers", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardSubNav isTeacher />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: en.dashboard.nav.invoices })).toHaveAttribute(
      "href",
      "/dashboard/invoices",
    );
  });

  test("shows my teachers tab for students", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardSubNav isStudent />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: en.dashboard.nav.myTeachers })).toHaveAttribute(
      "href",
      "/dashboard/my-teachers",
    );
  });

  test("does not render on Settings because settings has its own tabs", () => {
    usePathnameMock.mockReturnValue("/en/dashboard/settings");
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardSubNav isTeacher />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("navigation", { name: en.dashboard.nav.ariaLabel })).toBeNull();
  });
});
