// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { AdminUserGrid } from "../admin-user-grid";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & React.HTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("AdminUserGrid skeleton loading", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders 10 skeleton rows while the user list is loading", async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdminUserGrid columnStorageKey="admin.users.cols.test" mode="all" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByTestId("admin-user-grid-skeleton-row").length,
      ).toBe(10);
    });
  });

  test("replaces skeleton rows with real rows after the fetch resolves", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "u1",
            name: "Alice",
            email: "alice@example.com",
            role: "STUDENT",
            locale: "en",
            accountStatus: "ACTIVE",
            createdAt: new Date("2024-01-01").toISOString(),
            updatedAt: new Date("2024-01-01").toISOString(),
            studentProfile: null,
            teacherProfile: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdminUserGrid columnStorageKey="admin.users.cols.test2" mode="all" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.queryAllByTestId("admin-user-grid-skeleton-row").length,
      ).toBe(0);
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
