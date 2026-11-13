// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { OnboardingForm } from "@/components/onboarding-form";

const browserZone = vi.hoisted(() => vi.fn(() => "Asia/Tokyo"));
vi.mock("@/hooks/use-browser-timezone", () => ({ useBrowserTimezone: browserZone }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderForm(locale: "en" | "ja" = "en", learningLanguage: "ENGLISH" | "JAPANESE" = "ENGLISH") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ja" ? ja : en}>
      <OnboardingForm initialTimezone="Asia/Tokyo" learningLanguage={learningLanguage} />
    </NextIntlClientProvider>,
  );
}

const next = () => screen.getByRole("button", { name: en.onboarding.wizardNext });

describe("OnboardingForm", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    browserZone.mockReturnValue("Asia/Tokyo");
  });

  test("starts at the first step", () => {
    renderForm();

    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
  });

  test("keeps the detected browser zone even if the list of named zones omits it", () => {
    browserZone.mockReturnValue("UTC");
    renderForm();
    expect(screen.getByRole("combobox", { name: en.onboarding.timezoneLabel })).toHaveValue("UTC");
  });

  test.each(["en", "ja"] as const)("Japanese learners receive subject-neutral goal choices and examples in %s", locale => {
    const copy = locale === "ja" ? ja : en;
    renderForm(locale, "JAPANESE");
    fireEvent.click(screen.getByRole("button", { name: copy.onboarding.wizardNext }));
    expect(screen.getByRole("button", { name: locale === "ja" ? "仕事・ビジネス" : "Business" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: locale === "ja" ? "旅行" : "Travel" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", locale === "ja" ? "例：仕事について10分間会話できるようになる" : "e.g. Talk about my work for 10 minutes");
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
