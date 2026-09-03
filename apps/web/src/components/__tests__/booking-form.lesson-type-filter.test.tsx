// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { BookingForm } from "../booking-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/** Picks a time, which is what opens the booking dialog. */
async function pickSlot(name: string | RegExp) {
  fireEvent.click(await screen.findByRole("button", { name }));
  await screen.findByText(en.booking.bookingModalTitle);
}

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

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("confirm is available once the chosen slot maps to a product", async () => {
    renderForm(presetSlots);
    await pickSlot(/10:00 AM/);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: en.booking.confirm })).toBeEnabled(),
    );
  });

  // The slot decides the lesson, so the dialog states it rather than asking.
  test("resolves the lesson from the slot that was picked", async () => {
    renderForm(presetSlots);

    // The pronunciation slot (Tue May 5, 11:00 JST).
    await pickSlot(/11:00 AM/);

    const review = screen.getByText(en.booking.selectProduct);
    expect(review.closest("div")).toHaveTextContent(/Pronunciation|発音/);
    expect(document.body.textContent).not.toMatch(/Conversation|英会話/);
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

    expect(await screen.findByTestId("slot-reserved-week")).toBeInTheDocument();
    // The overlapped 10:30 slot is gone, so there is nothing there to pick.
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

    expect((await screen.findAllByText(/9:30 PM/)).length).toBeGreaterThan(0);
    // The slot lands on Saturday Jul 4 in Toronto (not Sunday Jul 5 in Tokyo).
    expect(document.body.textContent).toMatch(/Sat 4\s*0?9:30 PM/);
    expect(document.body.textContent).toMatch(/Sun 5\s*Unavailable/);
    expect(document.body.textContent).not.toContain("10:30 AM");
  });

  // The one number a person needs before committing, and the summary never
  // showed it: a student could reach "Confirm booking" without being told the
  // price anywhere in the flow.
  test("says what the lesson costs before it is confirmed", async () => {
    renderForm(presetSlots);
    await pickSlot(/10:00 AM/);

    const price = screen.getByText(en.booking.reviewPrice);
    expect(price.closest("div")).toHaveTextContent(/¥3,000/);
    expect(price.closest("div")).toHaveTextContent(/tax included/);
  });

  test("says how long the lesson runs", async () => {
    renderForm(presetSlots);
    await pickSlot(/10:00 AM/);

    const duration = screen.getByText(en.booking.reviewDuration);
    expect(duration.closest("div")).toHaveTextContent(/30 min/);
  });

  // "Pick a time" described an action already taken by the time this is read.
  test("names the time as a fact, not an instruction", async () => {
    renderForm(presetSlots);
    await pickSlot(/10:00 AM/);

    expect(screen.getByText(en.booking.reviewDateTime)).toBeInTheDocument();
  });
});
