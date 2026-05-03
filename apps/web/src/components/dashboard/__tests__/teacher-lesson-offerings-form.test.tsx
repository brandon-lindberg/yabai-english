// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherLessonOfferingsForm } from "../teacher-lesson-offerings-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const classLevels = [
  { id: "lvl-beginner", code: "beginner", labelEn: "Beginner", labelJa: null },
];

const classTypes = [
  { id: "type-conversation", code: "conversation", labelEn: "Conversation", labelJa: null },
];

describe("TeacherLessonOfferingsForm", () => {
  test("renders lesson rates and trial settings outside the teacher profile form", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={2500}
          initialOffersFreeTrial={true}
          initialLessonOfferings={[
            {
              id: "offer-1",
              durationMin: 40,
              rateYen: 2500,
              isGroup: false,
              groupSize: null,
              classLevelId: "lvl-beginner",
              classTypeId: "type-conversation",
            },
          ]}
          classLevels={classLevels}
          classTypes={classTypes}
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByText(en.dashboard.profilePage.teacherRatesByDurationTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(en.dashboard.profilePage.teacherGroupRatesTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(en.dashboard.profilePage.teacherOffersFreeTrialLabel),
    ).toBeInTheDocument();
  });
});
