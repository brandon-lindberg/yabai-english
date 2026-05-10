// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherProfileForm } from "../teacher-profile-form";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("TeacherProfileForm", () => {
  test("does not render lesson rates or trial settings", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherProfileForm
          showGooglePrefillHint={false}
          initialTeacherProfileId="teacher-profile-1"
          initialDisplayName="Teacher One"
          initialBio={null}
          initialCountryOfOrigin={null}
          initialCredentials={null}
          initialInstructionLanguages={["EN"]}
          initialSpecialties={[]}
          initialMarketplaceHidden={false}
          postSaveRedirect={null}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.dashboard.profilePage.teacherBio)).toBeInTheDocument();
    expect(
      screen.queryByText(en.dashboard.profilePage.teacherRatesByDurationTitle),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(en.dashboard.profilePage.teacherOffersFreeTrialLabel),
    ).not.toBeInTheDocument();
  });
});
