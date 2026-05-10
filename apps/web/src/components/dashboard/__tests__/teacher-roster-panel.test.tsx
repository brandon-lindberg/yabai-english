// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi, beforeEach } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherRosterPanel } from "../teacher-roster-panel";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("TeacherRosterPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("links active roster row to student profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entries: [
            {
              id: "r1",
              status: "active",
              displayName: "Sam Student",
              email: "sam@example.com",
              studentUserId: "user-sam",
            },
          ],
        }),
      }),
    );

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherRosterPanel />
      </NextIntlClientProvider>,
    );

    const link = await screen.findByRole("link", { name: en.dashboard.studentsPage.openStudentProfile });
    expect(link).toHaveAttribute("href", "/dashboard/students/user-sam");
  });
});
