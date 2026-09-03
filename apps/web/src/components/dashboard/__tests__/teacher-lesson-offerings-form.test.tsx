// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

    const priceInput = screen.getByPlaceholderText("3000") as HTMLInputElement;
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
    const priceInput = screen.getByPlaceholderText("3000");
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

  test("does not offer the free trial or an admin-granted class as a rate to edit", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={4000}
          initialOffersFreeTrial
          initialLessonOfferings={[
            {
              id: "own-1",
              durationMin: 30,
              rateYen: 4000,
              isGroup: false,
              groupSize: null,
              classLevelId: "lv-1",
              classTypeId: "ty-1",
            },
            {
              id: "trial-1",
              durationMin: 20,
              rateYen: 0,
              isGroup: false,
              groupSize: null,
              isFreeTrial: true,
              classLevelId: "lv-1",
              classTypeId: "ty-1",
            },
            {
              id: "granted-1",
              durationMin: 30,
              rateYen: 1500,
              isGroup: false,
              groupSize: null,
              adminRateOverrideByUserId: "admin-1",
              classLevelId: "lv-1",
              classTypeId: "ty-1",
            },
          ]}
          classLevels={[{ id: "lv-1", code: "beginner", labelEn: "Beginner", labelJa: "初級" }]}
          classTypes={[{ id: "ty-1", code: "conversation", labelEn: "Conversation", labelJa: "会話" }]}
        />
      </NextIntlClientProvider>,
    );

    const rateInputs = screen
      .getAllByRole("textbox")
      .map((el) => (el as HTMLInputElement).value);

    // Only the teacher's own rate is editable. A 0 row would also block saving,
    // and a 1500 row would invite them to edit a concession they cannot grant.
    expect(rateInputs).toContain("4000");
    expect(rateInputs).not.toContain("0");
    expect(rateInputs).not.toContain("1500");
  });

  const BELOW_MIN = en.dashboard.profilePage.teacherRateBelowMinimum.replace(
    "{amount}",
    "3,000",
  );

  function renderWithOneRate(rateYen: number) {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={rateYen}
          initialOffersFreeTrial
          initialLessonOfferings={[
            {
              id: "own-1",
              durationMin: 30,
              rateYen,
              isGroup: false,
              groupSize: null,
              classLevelId: "lv-1",
              classTypeId: "ty-1",
            },
          ]}
          classLevels={[{ id: "lv-1", code: "beginner", labelEn: "Beginner", labelJa: "初級" }]}
          classTypes={[{ id: "ty-1", code: "conversation", labelEn: "Conversation", labelJa: "会話" }]}
        />
      </NextIntlClientProvider>,
    );
  }

  function rateInput() {
    return screen
      .getAllByRole("textbox")
      .find((el) => /^\d*$/.test((el as HTMLInputElement).value)) as HTMLInputElement;
  }

  test("says why a rate is too low as it is typed, not after saving", () => {
    renderWithOneRate(4000);

    fireEvent.change(rateInput(), { target: { value: "500" } });

    expect(screen.getByText(BELOW_MIN)).toBeTruthy();
    expect(rateInput().getAttribute("aria-invalid")).toBe("true");
  });

  test("refuses to submit while a rate is below the minimum", () => {
    renderWithOneRate(4000);

    fireEvent.change(rateInput(), { target: { value: "500" } });

    expect(
      (screen.getByRole("button", { name: en.dashboard.profilePage.save }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  test("clears the complaint once the rate is acceptable", () => {
    renderWithOneRate(4000);

    fireEvent.change(rateInput(), { target: { value: "500" } });
    fireEvent.change(rateInput(), { target: { value: "3000" } });

    expect(screen.queryByText(BELOW_MIN)).toBeNull();
    expect(
      (screen.getByRole("button", { name: en.dashboard.profilePage.save }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  // The minimum is on the tax-included price, so a tax-exclusive entry below
  // 3,000 can still be fine once tax is added. Judging the typed number would
  // reject a legitimate rate.
  test("judges the tax-included price, not the number typed", () => {
    renderWithOneRate(4000);
    fireEvent.click(screen.getByRole("radio", { name: /tax-exclusive/i }));

    fireEvent.change(rateInput(), { target: { value: "2800" } }); // -> ¥3,080 incl.

    expect(screen.queryByText(BELOW_MIN)).toBeNull();
  });

  test("suggests the minimum as the placeholder", () => {
    renderWithOneRate(4000);

    expect(rateInput().getAttribute("placeholder")).toBe("3000");
  });
});

describe("Google Meet group-call limit", () => {
  function renderWithGroupOffering(durationMin: number, groupSize: number) {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={3000}
          initialOffersFreeTrial={false}
          initialLessonOfferings={[
            {
              id: "offer-group",
              durationMin,
              rateYen: 3000,
              isGroup: true,
              groupSize,
              classLevelId: "lvl-beginner",
              classTypeId: "type-conversation",
            },
          ]}
          classLevels={classLevels}
          classTypes={classTypes}
        />
      </NextIntlClientProvider>,
    );
  }

  // The teacher advertises 90 minutes and Google hangs up at 60. They cannot
  // find that out from us after the fact — it has to be on the page.
  test("warns that a 90 minute group class would be cut short", () => {
    renderWithGroupOffering(90, 4);

    expect(
      screen.getByText(/ends group calls after 60 minutes/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/90-minute class would be cut short/i)).toBeInTheDocument();
  });

  test("flags a 60 minute group class as finishing on the buzzer", () => {
    renderWithGroupOffering(60, 4);

    expect(screen.getByText(/a late start loses time/i)).toBeInTheDocument();
  });

  test("says nothing about a 40 minute group class", () => {
    renderWithGroupOffering(40, 4);

    expect(screen.queryByText(/ends group calls after/i)).not.toBeInTheDocument();
  });

  test("says nothing about a long private lesson", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={3000}
          initialOffersFreeTrial={false}
          initialLessonOfferings={[
            {
              id: "offer-private",
              durationMin: 90,
              rateYen: 6000,
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

    // One-to-one calls run for 24 hours.
    expect(screen.queryByText(/ends group calls after/i)).not.toBeInTheDocument();
  });
});

describe("group class pricing", () => {
  function renderGroupForm(rateYen = 3000, groupSize = 4, groupTotalRateYen = 12000) {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonOfferingsForm
          initialRateYen={3000}
          initialOffersFreeTrial={false}
          initialLessonOfferings={[
            {
              id: "offer-group",
              durationMin: 40,
              rateYen,
              groupTotalRateYen,
              isGroup: true,
              groupSize,
              classLevelId: "lvl-beginner",
              classTypeId: "type-conversation",
            },
          ]}
          classLevels={classLevels}
          classTypes={classTypes}
        />
      </NextIntlClientProvider>,
    );
  }

  function totalField() {
    return screen.getByLabelText(
      en.dashboard.profilePage.teacherGroupTotalLabelTaxIncluded,
    );
  }

  test("asks for the price of the class, not the price of a seat", () => {
    renderGroupForm();
    expect(totalField()).toBeInTheDocument();
    expect(
      screen.getByLabelText(en.dashboard.profilePage.teacherGroupSizeLabel),
    ).toBeInTheDocument();
  });

  test("shows the share and what a full class collects", () => {
    renderGroupForm();
    fireEvent.change(totalField(), { target: { value: "16000" } });

    // 16,000 across 4 seats.
    expect(screen.getByText(/¥4,000 per student · ¥16,000 when full/)).toBeInTheDocument();
  });

  // Placement is the point: the teacher types a class total, so the figure each
  // student pays has to sit with that field. Below the whole row it read as
  // unrelated to what they had just typed.
  test("puts the share beside the total, above the tax breakdown", () => {
    renderGroupForm();
    fireEvent.change(totalField(), { target: { value: "20000" } });

    // Scoped to the group row: the individual-rate row has its own tax line.
    const share = screen.getByText(/per student · /);
    const slot = share.parentElement!;
    const tax = within(slot).getByText(/Consumption tax portion/);

    expect(tax).toBeInTheDocument();
    // Share first: it is the number the teacher came for.
    expect(share.compareDocumentPosition(tax)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  // A share under the floor is not summarised as though it were fine: the row
  // says what is wrong instead.
  test("replaces the summary with the reason when the share is too low", () => {
    renderGroupForm();
    fireEvent.change(totalField(), { target: { value: "8000" } });

    expect(screen.queryByText(/per student · /)).not.toBeInTheDocument();
    expect(screen.getByText(/Each student would pay ¥2,000/)).toBeInTheDocument();
  });

  // Ceiling division, so the class never collects less than the teacher asked.
  test("rounds the share up when the split is uneven", () => {
    renderGroupForm();
    fireEvent.change(
      screen.getByLabelText(en.dashboard.profilePage.teacherGroupSizeLabel),
      { target: { value: "3" } },
    );
    fireEvent.change(totalField(), { target: { value: "10000" } });

    expect(screen.getByText(/¥3,334 per student · ¥10,002 when full/)).toBeInTheDocument();
  });

  test("recomputes both figures when the seat count changes", () => {
    renderGroupForm();
    fireEvent.change(totalField(), { target: { value: "12000" } });
    expect(screen.getByText(/¥3,000 per student/)).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText(en.dashboard.profilePage.teacherGroupSizeLabel),
      { target: { value: "3" } },
    );
    expect(screen.getByText(/¥4,000 per student/)).toBeInTheDocument();
  });

  // The locked decision, enforced where the teacher can see it: the ¥3,000
  // floor is held against the share, not against the class total.
  test("refuses a total whose share falls under the public minimum", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderGroupForm();

    fireEvent.change(totalField(), { target: { value: "8000" } });
    expect(screen.getByText(/Each student would pay ¥2,000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.save }));
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  test("sends the share as the price and keeps the total beside it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    renderGroupForm();

    fireEvent.change(totalField(), { target: { value: "16000" } });
    fireEvent.click(screen.getByRole("button", { name: en.dashboard.profilePage.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const group = body.lessonOfferings.find((o: { isGroup: boolean }) => o.isGroup);
    expect(group).toMatchObject({
      isGroup: true,
      groupSize: 4,
      rateYen: 4000,
      groupTotalRateYen: 16000,
    });
  });
});
