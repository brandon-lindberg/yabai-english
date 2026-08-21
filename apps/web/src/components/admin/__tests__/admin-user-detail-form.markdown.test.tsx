// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

const { AdminUserDetailForm } = await import("../admin-user-detail-form");
const copy = en.admin.userDetail;

function mockUser(role: "STUDENT" | "TEACHER") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "u1",
        name: "Person",
        email: "p@example.com",
        role,
        accountStatus: "ACTIVE",
        studentProfile:
          role === "STUDENT"
            ? { timezone: "Asia/Tokyo", shortBio: "", placedLevel: null, placedSubLevel: null, placementNeedsReview: false, placementReviewReason: "" }
            : null,
        teacherProfile:
          role === "TEACHER"
            ? {
                displayName: "T",
                bio: "",
                countryOfOrigin: "",
                credentials: "",
                rateYen: null,
                offersFreeTrial: true,
                specialties: [],
                instructionLanguages: ["EN"],
              }
            : null,
      }),
    }),
  );
}

function renderAdmin() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminUserDetailForm userId="u1" />
    </NextIntlClientProvider>,
  );
}

describe("AdminUserDetailForm prose fields are markdown", () => {
  test("a student's short bio is edited as markdown, matching what the student authored", async () => {
    mockUser("STUDENT");
    renderAdmin();

    const group = await screen.findByRole("group", { name: copy.shortBio });
    expect(group.querySelector('[data-testid="markdown-editor"]')).not.toBeNull();
  });

  test("the placement review reason is markdown", async () => {
    mockUser("STUDENT");
    renderAdmin();

    const group = await screen.findByRole("group", { name: copy.placementReviewReason });
    expect(group.querySelector('[data-testid="markdown-editor"]')).not.toBeNull();
  });

  test("a teacher's bio and credentials are markdown", async () => {
    mockUser("TEACHER");
    renderAdmin();

    for (const label of [copy.bio, copy.credentials]) {
      const group = await screen.findByRole("group", { name: label });
      expect(group.querySelector('[data-testid="markdown-editor"]')).not.toBeNull();
    }
  });

  test("no bare textarea survives on the admin student form", async () => {
    mockUser("STUDENT");
    const { container } = renderAdmin();

    await waitFor(() => expect(screen.getAllByTestId("markdown-editor").length).toBeGreaterThan(0));
    const bare = Array.from(container.querySelectorAll("textarea")).filter(
      (el) => el.dataset.testid !== "markdown-editor",
    );
    expect(bare).toHaveLength(0);
  });
});
