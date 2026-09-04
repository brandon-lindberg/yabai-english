// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// jsdom does not implement showModal, and it has to actually set `open` or the
// dialog's contents stay out of the accessibility tree. The profile form is
// rendered inside one now.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

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

describe("DashboardProfileForm — what a teacher reads about a student", () => {
  /*
    A teacher planning a lesson reads the student's level, their goals and
    their introduction. The student could only ever edit the last of those:
    goals were collected once by the onboarding wizard and then frozen, so
    somebody who started for travel and moved on to an exam had no way to say
    so.

    Level is not in the same category — it is the placement result, earned
    rather than declared — so it is shown and not offered for editing.
  */
  function renderWithGoals(props: Record<string, unknown> = {}) {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardProfileForm
          showGooglePrefillHint={false}
          initialName="Student One"
          initialShortBio="Hello"
          avatarUrl={null}
          initialLearningGoals={["business"]}
          {...props}
        />
      </NextIntlClientProvider>,
    );
  }

  test("lists the goals on the profile", () => {
    renderWithGoals();

    expect(screen.getByText(en.onboarding.goalBusiness)).toBeInTheDocument();
  });

  test("opens with what the student already chose", () => {
    // The view listed them, but the editor is where it matters: opening with
    // everything unpicked reads as "you have no goals" and one careless save
    // makes that true.
    renderWithGoals({ initialLearningGoals: ["conversation", "travel"] });

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.editProfile }));

    expect(screen.getByRole("button", { name: en.onboarding.goalConversation })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: en.onboarding.goalTravel })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: en.onboarding.goalBusiness })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("lets the student change them", () => {
    renderWithGoals();
    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.editProfile }));

    const travel = screen.getByRole("button", { name: en.onboarding.goalTravel });
    expect(travel).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(travel);

    expect(travel).toHaveAttribute("aria-pressed", "true");
  });

  test("sends the goals with the save", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithGoals();
    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.editProfile }));
    fireEvent.click(screen.getByRole("button", { name: en.onboarding.goalTravel }));

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      learningGoals: string[];
    };
    expect(body.learningGoals).toEqual(["business", "travel"]);
    vi.unstubAllGlobals();
  });

  test("shows the placement level without offering to edit it", () => {
    // It is the result of the placement activity, not something to declare.
    renderWithGoals({ placedLevel: "INTERMEDIATE" });

    expect(screen.getByText(en.dashboard.profilePage.levelIntermediate)).toBeInTheDocument();
  });
});

