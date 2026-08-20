// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        viewerTimezone="Asia/Tokyo"
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
    teacherClassTypeId: "ty-conv",
    teacherClassTypeCode: "conversation",
    teacherClassTypeLabelEn: "Conversation",
    teacherClassTypeLabelJa: "会話",
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
    teacherClassTypeId: "ty-pron",
    teacherClassTypeCode: "pronunciation",
    teacherClassTypeLabelEn: "Pronunciation",
    teacherClassTypeLabelJa: "発音",
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
    classTypeId: "ty-conv",
  },
  {
    startsAtIso: "2026-05-05T02:00:00.000Z",
    label: "Tue, May 5 11:00",
    groupKey: "slot-pron",
    classTypeId: "ty-pron",
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

  test("confirm button is enabled with 'All lesson types' once the selected slot maps to a product", async () => {
    renderForm(presetSlots);

    await screen.findByLabelText(en.booking.selectProduct);
    const confirm = screen.getByRole("button", { name: en.booking.confirm });
    expect(confirm).toBeDisabled();

    // Pick the conversation slot (Mon May 4, 10:00 JST) from the calendar.
    fireEvent.click(await screen.findByRole("button", { name: "10:00 AM" }));

    await waitFor(() => expect(confirm).not.toBeDisabled());
  });

  test("lesson type options are limited to products matching the chosen slot", async () => {
    renderForm(presetSlots);

    const select = (await screen.findByLabelText(
      en.booking.selectProduct,
    )) as HTMLSelectElement;
    // Before a slot is chosen, all products are listed and the step is locked.
    await waitFor(() => expect(select.querySelectorAll("option").length).toBe(3));
    expect(select).toBeDisabled();

    // Pick the pronunciation slot (Tue May 5, 11:00 JST).
    fireEvent.click(await screen.findByRole("button", { name: "11:00 AM" }));

    await waitFor(() => expect(select).not.toBeDisabled());
    const optionValues = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(optionValues).toContain(ALL_LESSON_TYPES_KEY);
    expect(optionValues).toContain("prod-pron::off-pron");
    expect(optionValues).not.toContain("prod-conv::off-conv");
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

  test("overlapping booked slots remove open availability even when start times differ", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingForm
          teacherProfileId="t1"
          currentUserRole="STUDENT"
          viewerTimezone="Asia/Tokyo"
          presetSlots={[
            {
              startsAtIso: "2026-05-04T01:30:00.000Z",
              endsAtIso: "2026-05-04T02:10:00.000Z",
              label: "Mon, May 4 10:30",
              groupKey: "slot-conv",
              classTypeId: "ty-conv",
            },
          ]}
          bookedSlots={[
            {
              startsAtIso: "2026-05-04T01:45:00.000Z",
              endsAtIso: "2026-05-04T02:00:00.000Z",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    await screen.findByLabelText(en.booking.selectProduct);

    expect(await screen.findByTestId("slot-reserved-week")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.booking.confirm })).toBeDisabled();
    expect(document.body.textContent).not.toContain("10:30 AM");
  });

  test("renders availability in the student's viewer timezone", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingForm
          teacherProfileId="t1"
          currentUserRole="STUDENT"
          viewerTimezone="America/Toronto"
          presetSlots={[
            {
              startsAtIso: "2026-07-05T01:30:00.000Z",
              endsAtIso: "2026-07-05T02:10:00.000Z",
              label: "Sat, Jul 4 21:30 - 22:10 (America/Toronto)",
              groupKey: "slot-conv",
              classTypeId: "ty-conv",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    await screen.findByLabelText(en.booking.selectProduct);

    expect((await screen.findAllByText(/9:30 PM/)).length).toBeGreaterThan(0);
    // The slot lands on Saturday Jul 4 in Toronto (not Sunday Jul 5 in Tokyo).
    expect(document.body.textContent).toMatch(/Sat 4\s*0?9:30 PM/);
    expect(document.body.textContent).toMatch(/Sun 5\s*Unavailable/);
    expect(document.body.textContent).not.toContain("10:30 AM");
  });
});
