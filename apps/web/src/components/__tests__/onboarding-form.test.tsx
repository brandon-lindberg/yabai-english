// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { OnboardingForm } from "@/components/onboarding-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OnboardingForm initialTimezone="Asia/Tokyo" />
    </NextIntlClientProvider>,
  );
}

const next = () => screen.getByRole("button", { name: en.onboarding.wizardNext });

describe("OnboardingForm", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test("starts at the first step", () => {
    renderForm();

    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
  });

  test("keeps your place when the form is remounted", () => {
    // Switching language navigates to the other locale's route, which is a full
    // remount. It used to drop you back at step one.
    const first = renderForm();
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument();
    first.unmount();

    renderForm();

    expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument();
  });

  test("keeps your answers, not just your place", () => {
    // Restoring the step alone would put someone on the terms page with their
    // goals quietly back at the defaults — and they would submit those.
    const first = renderForm();
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: en.onboarding.goalBusiness }));
    fireEvent.click(screen.getByRole("button", { name: en.onboarding.goalConversation }));
    first.unmount();

    renderForm();

    expect(
      screen.getByRole("button", { name: en.onboarding.goalBusiness }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: en.onboarding.goalConversation }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("never restores consent as already given", () => {
    // Agreeing to terms has to be an act performed on this page, not something
    // a restored draft can assert on the student's behalf.
    window.sessionStorage.setItem(
      "onboarding-wizard",
      JSON.stringify({ step: 3, acceptedTerms: true, acceptedPrivacy: true }),
    );
    renderForm();

    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
  });
});
