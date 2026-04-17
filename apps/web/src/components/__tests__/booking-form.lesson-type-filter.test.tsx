// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { BookingForm } from "../booking-form";
import { ALL_LESSON_TYPES_KEY } from "@/lib/booking-lesson-type-filter";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderForm(presetSlots: React.ComponentProps<typeof BookingForm>["presetSlots"]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BookingForm
        teacherProfileId="t1"
        currentUserRole="STUDENT"
        presetSlots={presetSlots}
      />
    </NextIntlClientProvider>,
  );
}

const products = [
  {
    id: "prod-conv",
    nameJa: "英会話",
    nameEn: "Conversation",
    durationMin: 30,
    tier: "EIKAWA",
    teacherLessonOfferingId: "off-conv",
    teacherLessonType: "conversation",
    teacherLessonTypeCustom: null,
    teacherRateYen: 3000,
    teacherGroupSize: null,
    teacherIsGroupOffer: false,
  },
  {
    id: "prod-pron",
    nameJa: "発音",
    nameEn: "Pronunciation",
    durationMin: 30,
    tier: "PRONUNCIATION_ACTING",
    teacherLessonOfferingId: "off-pron",
    teacherLessonType: "pronunciation",
    teacherLessonTypeCustom: null,
    teacherRateYen: 3500,
    teacherGroupSize: null,
    teacherIsGroupOffer: false,
  },
];

const presetSlots = [
  {
    startsAtIso: "2026-05-04T01:00:00.000Z",
    label: "Mon, May 4 10:00",
    groupKey: "slot-conv",
    lessonType: "conversation",
    lessonTypeCustom: null,
  },
  {
    startsAtIso: "2026-05-05T01:00:00.000Z",
    label: "Tue, May 5 10:00",
    groupKey: "slot-pron",
    lessonType: "pronunciation",
    lessonTypeCustom: null,
  },
] as NonNullable<React.ComponentProps<typeof BookingForm>["presetSlots"]>;

describe("BookingForm lesson type filter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (typeof url === "string" && url.startsWith("/api/lesson-products")) {
          return new Response(JSON.stringify(products), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("defaults to 'All lesson types' with an explicit sentinel option", async () => {
    renderForm(presetSlots);

    const select = (await screen.findByLabelText(
      en.booking.selectProduct,
    )) as HTMLSelectElement;

    await waitFor(() => {
      const hasAllOption = Array.from(select.querySelectorAll("option")).some(
        (o) => o.value === ALL_LESSON_TYPES_KEY,
      );
      expect(hasAllOption).toBe(true);
    });

    expect(select.value).toBe(ALL_LESSON_TYPES_KEY);
    const allOption = Array.from(select.querySelectorAll("option")).find(
      (o) => o.value === ALL_LESSON_TYPES_KEY,
    );
    expect(allOption?.textContent).toMatch(/All lesson types/i);
  });

  test("confirm button is disabled while 'All lesson types' is selected (no product chosen)", async () => {
    renderForm(presetSlots);

    await screen.findByLabelText(en.booking.selectProduct);
    const confirm = screen.getByRole("button", { name: en.booking.confirm });
    expect(confirm).toBeDisabled();
  });

  test("booked slots appear as 'Reserved' markers and never leak student names", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingForm
          teacherProfileId="t1"
          currentUserRole="STUDENT"
          presetSlots={presetSlots}
          bookedSlots={[
            {
              startsAtIso: "2026-05-04T01:00:00.000Z",
              endsAtIso: "2026-05-04T01:30:00.000Z",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    await screen.findByLabelText(en.booking.selectProduct);

    const reservedBlocks = await screen.findAllByTestId("slot-reserved-week");
    expect(reservedBlocks.length).toBeGreaterThanOrEqual(1);
    const combinedText = reservedBlocks.map((b) => b.textContent ?? "").join(" ");
    expect(combinedText).toMatch(/Reserved/i);

    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(/Alice|Brandon|Suzuki|StudentName/);
  });
});
