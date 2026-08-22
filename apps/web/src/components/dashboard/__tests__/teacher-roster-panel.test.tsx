// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  function mockRoster(byScope: Record<string, unknown[]>) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return { ok: true, json: async () => ({ ok: true }) };
      const scope = new URL(url, "http://localhost").searchParams.get("scope") ?? "active";
      return { ok: true, json: async () => ({ entries: byScope[scope] ?? [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const activeRow = {
    id: "r1",
    status: "active",
    displayName: "Sam Student",
    email: "sam@example.com",
    studentUserId: "user-sam",
    archivedAtIso: null,
  };
  const archivedRow = {
    id: "r2",
    status: "active",
    displayName: "Gone Grace",
    email: "grace@example.com",
    studentUserId: "user-grace",
    archivedAtIso: "2026-08-20T00:00:00.000Z",
  };

  function renderPanel() {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherRosterPanel />
      </NextIntlClientProvider>,
    );
  }

  const copy = en.dashboard.studentsPage;

  test("offers an Archived tab alongside the active roster", async () => {
    mockRoster({ active: [activeRow] });
    renderPanel();

    expect(await screen.findByRole("tab", { name: copy.activeTab })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: copy.archivedTab })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("archiving a student calls the archive endpoint rather than deleting them", async () => {
    // Archiving must never reach DELETE: the teacher keeps the history.
    const fetchMock = mockRoster({ active: [activeRow] });
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: copy.archive }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patch).toBeTruthy();
      expect(patch![0]).toBe("/api/teacher/roster/r1");
      expect(JSON.parse(patch![1]!.body as string)).toEqual({ archived: true });
    });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });

  test("the Archived tab lists archived students and offers Restore", async () => {
    mockRoster({ active: [activeRow], archived: [archivedRow] });
    renderPanel();

    fireEvent.click(await screen.findByRole("tab", { name: copy.archivedTab }));

    expect(await screen.findByText("Gone Grace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.restore })).toBeInTheDocument();
    // An archived student is not offered again for archiving.
    expect(screen.queryByRole("button", { name: copy.archive })).toBeNull();
  });

  test("restoring sends archived:false", async () => {
    const fetchMock = mockRoster({ active: [], archived: [archivedRow] });
    renderPanel();

    fireEvent.click(await screen.findByRole("tab", { name: copy.archivedTab }));
    fireEvent.click(await screen.findByRole("button", { name: copy.restore }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(JSON.parse(patch![1]!.body as string)).toEqual({ archived: false });
    });
  });

  test("an archived student's profile is still reachable", async () => {
    // The whole point of archiving over removing: their information stays.
    mockRoster({ active: [], archived: [archivedRow] });
    renderPanel();

    fireEvent.click(await screen.findByRole("tab", { name: copy.archivedTab }));

    const link = await screen.findByRole("link", { name: copy.openStudentProfile });
    expect(link).toHaveAttribute("href", "/dashboard/students/user-grace");
  });

  test("says so when nothing has been archived", async () => {
    mockRoster({ active: [activeRow], archived: [] });
    renderPanel();

    fireEvent.click(await screen.findByRole("tab", { name: copy.archivedTab }));

    expect(await screen.findByText(copy.archivedEmpty)).toBeInTheDocument();
  });
});
