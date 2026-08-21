// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui/markdown-editor", () => ({
  MarkdownEditor: ({
    markdown,
    onChange,
    ref,
  }: {
    markdown: string;
    onChange?: (md: string) => void;
    ref?: { current: unknown };
  }) => {
    if (ref) ref.current = { setMarkdown: vi.fn(), getMarkdown: () => markdown };
    return (
      <textarea
        data-testid="markdown-editor"
        value={markdown}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  },
}));

const { DashboardProfileForm } = await import("../dashboard-profile-form");
const copy = en.dashboard.profilePage;

function renderForm(initialShortBio: string | null = null) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardProfileForm
        showGooglePrefillHint={false}
        initialName="Student One"
        initialShortBio={initialShortBio}
        avatarUrl={null}
        postSaveRedirect="/onboarding/next"
      />
    </NextIntlClientProvider>,
  );
}

describe("DashboardProfileForm short bio", () => {
  test("collects the bio through a markdown editor", () => {
    renderForm();

    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
  });

  test("names the editor with the short bio label", () => {
    renderForm();

    expect(screen.getByRole("group", { name: copy.shortBio })).toBeInTheDocument();
  });

  test("counts markdown source against the 300-character column", () => {
    renderForm("hello");

    expect(screen.getByText("5 / 300")).toBeInTheDocument();
  });

  test("clips typing past the cap so the PATCH cannot exceed the column", () => {
    renderForm();

    fireEvent.change(screen.getByTestId("markdown-editor"), {
      target: { value: "x".repeat(320) },
    });

    expect(screen.getByText("300 / 300")).toBeInTheDocument();
  });

  test("shows the markdown help text", () => {
    renderForm();

    expect(screen.getByText(copy.shortBioHelp)).toBeInTheDocument();
  });
});
