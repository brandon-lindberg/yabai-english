// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

// MDXEditor is Lexical-backed behind next/dynamic({ssr:false}) and never
// renders in jsdom; stand in a textarea that speaks the same contract.
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

const { TeacherProfileForm } = await import("../teacher-profile-form");
const copy = en.dashboard.profilePage;

function renderForm(overrides: Record<string, unknown> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherProfileForm
        showGooglePrefillHint={false}
        avatarUrl={null}
        initialTeacherProfileId="teacher-profile-1"
        initialDisplayName="Teacher One"
        initialBio={null}
        initialCountryOfOrigin={null}
        initialCredentials={null}
        initialInstructionLanguages={["EN"]}
        initialSpecialties={[]}
        initialMarketplaceHidden={false}
        postSaveRedirect={null}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

/** ProfileSurface opens in read mode; the editors only exist once editing. */
function renderEditing(overrides: Record<string, unknown> = {}) {
  return renderForm({ postSaveRedirect: "/onboarding/next", ...overrides });
}

describe("TeacherProfileForm markdown fields", () => {
  test("collects the bio through a markdown editor, not a plain textarea", () => {
    renderEditing();

    const group = screen.getByRole("group", { name: copy.teacherBio });
    expect(within(group).getByTestId("markdown-editor")).toBeInTheDocument();
  });

  test("collects credentials through a markdown editor too", () => {
    renderEditing();

    const group = screen.getByRole("group", { name: copy.teacherCredentials });
    expect(within(group).getByTestId("markdown-editor")).toBeInTheDocument();
  });

  test("leaves no bare textarea behind on the profile form", () => {
    // The whole point of the sweep: prose is authored as markdown everywhere.
    const { container } = renderEditing();

    const bare = Array.from(container.querySelectorAll("textarea")).filter(
      (el) => el.dataset.testid !== "markdown-editor",
    );
    expect(bare).toHaveLength(0);
  });

  test("counts bio markdown against the stored 2000-character cap", () => {
    renderEditing({ initialBio: "**hi**" });

    expect(screen.getByText("6 / 2000")).toBeInTheDocument();
  });

  test("shows the saved bio as rendered markdown, not source", () => {
    // The profile reads as a profile, so `**bold**` must not leak through.
    const { container } = renderForm({ initialBio: "**Certified** teacher" });

    expect(container.querySelector("strong")?.textContent).toBe("Certified");
    expect(container.textContent).not.toContain("**Certified**");
  });
});

describe("TeacherProfileForm", () => {
  test("does not render lesson rates or trial settings", () => {
    renderForm();

    expect(screen.getAllByText(en.dashboard.profilePage.teacherBio).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(en.dashboard.profilePage.teacherRatesByDurationTitle),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(en.dashboard.profilePage.teacherOffersFreeTrialLabel),
    ).not.toBeInTheDocument();
  });

  test("shows OAuth avatar when avatarUrl is set", () => {
    renderForm({ avatarUrl: "https://example.com/avatar.png" });

    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });
});
