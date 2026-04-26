// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <a {...props}>{children}</a>
  ),
}));

import { OrgSchoolsList } from "../org-schools-list";

const orgId = "org-1";

const schoolsResponse = {
  schools: [
    {
      id: "s1",
      slug: "english-school",
      name: "English School",
      _count: { memberships: 12 },
    },
  ],
};

function setupFetchMock() {
  const fetchSpy = vi.fn(async () => {
    return new Response(JSON.stringify(schoolsResponse), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OrgSchoolsList orgId={orgId} />
    </NextIntlClientProvider>,
  );
}

describe("OrgSchoolsList", () => {
  beforeEach(() => setupFetchMock());
  afterEach(() => vi.unstubAllGlobals());

  test("renders schools without applicationFlow / selfEnrollment badges", async () => {
    renderList();
    await waitFor(() => screen.getByText("English School"));

    // The legacy enable/disable badges should be gone.
    expect(screen.queryByText(/Application flow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Self-enrollment/i)).not.toBeInTheDocument();
  });

  test("shows the member count for each school", async () => {
    renderList();
    await waitFor(() => screen.getByText("English School"));
    // i18n key: org.schoolsPage.memberCount with {count} placeholder
    expect(screen.getByText(/12.*member/i)).toBeInTheDocument();
  });
});
