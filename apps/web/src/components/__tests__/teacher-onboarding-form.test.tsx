// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { TeacherOnboardingForm } from "../teacher-onboarding-form";

const push = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("TeacherOnboardingForm onboarding links", () => {
  test("profile step includes onboardingNext return URL", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherOnboardingForm completedParam={null} />
      </NextIntlClientProvider>,
    );

    const openLinks = screen.getAllByRole("link", { name: en.onboarding.teacherOpenStep });
    const profileOpenLink = openLinks[0];
    expect(profileOpenLink).toBeTruthy();

    const href = profileOpenLink.getAttribute("href");
    expect(href).toContain("/en/dashboard/profile?onboardingNext=");
    expect(href).toContain(encodeURIComponent("/onboarding/teacher?completed=profile"));
  });
});

describe("TeacherOnboardingForm skip for now", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    push.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders a Skip for now button", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherOnboardingForm completedParam={null} />
      </NextIntlClientProvider>,
    );
    const skip = screen.getByTestId("teacher-onboarding-skip");
    expect(skip.textContent).toContain(en.onboarding.skipForNow);
  });

  test("skip posts to /api/onboarding/teacher and navigates to /dashboard even when steps are unchecked", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherOnboardingForm completedParam={null} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByTestId("teacher-onboarding-skip"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/teacher", {
        method: "POST",
      });
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });
});
