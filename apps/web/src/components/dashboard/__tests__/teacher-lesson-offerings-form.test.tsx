// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  test("shows tax and before-tax amounts when entering tax-included price", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={null}
          initialOffersFreeTrial={true}
          initialLessonOfferings={[
            {
              id: "offer-1",
              durationMin: 40,
              rateYen: 3300,
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
      screen.getByText(
        (content) =>
          content.includes("300") &&
          content.includes("3000") &&
          content.includes("Consumption tax portion"),
      ),
    ).toBeInTheDocument();
  });

  test("converts displayed amount when switching from tax-included to tax-exclusive entry", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={null}
          initialOffersFreeTrial={true}
          initialLessonOfferings={[
            {
              id: "offer-1",
              durationMin: 40,
              rateYen: 3300,
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

    const priceInput = screen.getByPlaceholderText("3500") as HTMLInputElement;
    expect(priceInput.value).toBe("3300");

    fireEvent.click(
      screen.getByRole("radio", {
        name: /Tax-exclusive/,
      }),
    );
    expect(priceInput.value).toBe("3000");
  });

  test("submits tax-included rateYen when teacher enters tax-exclusive amount", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={null}
          initialOffersFreeTrial={true}
          initialLessonOfferings={[
            {
              id: "offer-1",
              durationMin: 40,
              rateYen: 3300,
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

    fireEvent.click(
      screen.getByRole("radio", {
        name: /Tax-exclusive/,
      }),
    );
    const priceInput = screen.getByPlaceholderText("3500");
    fireEvent.change(priceInput, { target: { value: "4000" } });

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.save }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const call0 = fetchMock.mock.calls[0] as unknown as [string, { body?: string }];
    expect(call0?.[1]?.body).toBeDefined();
    const body = JSON.parse(call0![1].body!) as { lessonOfferings: { rateYen: number }[] };
    expect(body.lessonOfferings[0]?.rateYen).toBe(4400);

    vi.unstubAllGlobals();
  });
});
