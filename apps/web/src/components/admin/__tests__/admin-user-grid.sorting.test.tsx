// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { AdminUserGrid } from "../admin-user-grid";

/**
 * Five sortable columns announced nothing: no `aria-sort` anywhere, so a screen
 * reader could not tell which column was in force or which way round, and the
 * header buttons reordered the table silently.
 */

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: { children: React.ReactNode; href: string } & React.HTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderGrid() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminUserGrid mode="all" columnStorageKey="test-sorting" />
    </NextIntlClientProvider>,
  );
}

describe("AdminUserGrid sorting", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  test("the sorted column announces its direction, and only that column", async () => {
    renderGrid();

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: en.admin.grid.colCreated })).toBeTruthy();
    });

    // Default is createdAt_desc.
    const created = screen.getByRole("columnheader", { name: en.admin.grid.colCreated });
    expect(created.getAttribute("aria-sort")).toBe("descending");

    const name = screen.getByRole("columnheader", { name: en.admin.grid.colName });
    expect(name.getAttribute("aria-sort")).toBeNull();
  });

  test("clicking a header moves the sort, and the announcement follows it", async () => {
    renderGrid();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.admin.grid.colName })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: en.admin.grid.colName }));

    await waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: en.admin.grid.colName }).getAttribute("aria-sort"),
      ).toBe("descending");
    });
    expect(
      screen.getByRole("columnheader", { name: en.admin.grid.colCreated }).getAttribute("aria-sort"),
    ).toBeNull();

    // Clicking the same header again flips direction rather than re-sorting.
    fireEvent.click(screen.getByRole("button", { name: en.admin.grid.colName }));
    await waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: en.admin.grid.colName }).getAttribute("aria-sort"),
      ).toBe("ascending");
    });
  });

  test("the sort summary reads as words, not as the raw enum", async () => {
    renderGrid();

    await waitFor(() => {
      expect(screen.getByText("Sorted by Created, descending")).toBeTruthy();
    });
    // Was "Sort: createdAt desc" — the identifier, straight from the state.
    expect(screen.queryByText(/createdAt/)).toBeNull();
  });
});
