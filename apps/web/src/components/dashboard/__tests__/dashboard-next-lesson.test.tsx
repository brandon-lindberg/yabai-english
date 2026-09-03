// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import {
  DashboardNextLesson,
  type NextLessonView,
} from "../dashboard-next-lesson";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (ns: string) => {
    const dashboard = en.dashboard as Record<string, unknown>;
    const messages = (ns === "dashboard.highlights"
      ? dashboard.highlights
      : dashboard) as Record<string, string>;
    return (key: string, values?: Record<string, string | number>) => {
      const template = messages[key] ?? key;
      return values
        ? template.replace(/\{(\w+)\}/g, (_m, name: string) => String(values[name] ?? ""))
        : template;
    };
  },
}));

const h = en.dashboard.highlights;

const base: NextLessonView = {
  id: "booking-1",
  startsAt: new Date("2026-09-24T06:00:00.000Z"),
  endsAt: new Date("2026-09-24T07:00:00.000Z"),
  counterpartName: "Brandon Lindberg",
  lessonNameJa: "英会話（60分）",
  lessonNameEn: "Conversation",
  status: "CONFIRMED",
  meetUrl: null,
};

async function renderNext(next: NextLessonView, canCompletePayment = false) {
  const ui = await DashboardNextLesson({
    next,
    emptyMessage: "none",
    emptyAction: null,
    canCompletePayment,
  });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("DashboardNextLesson — an unpaid reservation", () => {
  const pending: NextLessonView = {
    ...base,
    status: "PENDING_PAYMENT",
    holdExpiresAt: new Date("2026-09-21T09:00:00.000Z"),
  };

  // Shown under "Next lesson" with a confirmed-looking time, an unpaid hold
  // read as done — while the three-hour window quietly ran out.
  test("calls it a reservation, not a booked lesson", async () => {
    await renderNext(pending, true);

    expect(screen.getByRole("heading", { name: h.reservationTitle })).toBeInTheDocument();
    expect(screen.queryByText(h.nextLessonTitle)).toBeNull();
  });

  test("says when the hold runs out", async () => {
    await renderNext(pending, true);

    expect(screen.getByText(/This time is held for you until/)).toBeInTheDocument();
    expect(screen.getByText(/the reservation will be released/)).toBeInTheDocument();
  });

  test("leads with the way to finish paying", async () => {
    await renderNext(pending, true);

    expect(
      screen.getByRole("button", { name: en.booking.pendingReservationPay }),
    ).toBeInTheDocument();
  });

  test("still offers a way to give the time back", async () => {
    await renderNext(pending, true);

    expect(
      screen.getByRole("button", { name: en.booking.pendingReservationCancel }),
    ).toBeInTheDocument();
  });

  // A teacher sees the same booking but cannot settle it — offering them
  // "Complete payment" would be offering to charge somebody else's card.
  test("never offers payment to someone who does not owe it", async () => {
    await renderNext(pending, false);

    expect(screen.queryByRole("button", { name: en.booking.pendingReservationPay })).toBeNull();
    expect(screen.getByRole("heading", { name: h.nextLessonTitle })).toBeInTheDocument();
    // They still see that it is unpaid.
    expect(screen.getByText(en.dashboard.statusPendingPayment)).toBeInTheDocument();
  });
});

describe("DashboardNextLesson — a confirmed lesson", () => {
  test("is still just the next lesson", async () => {
    await renderNext(base, true);

    expect(screen.getByRole("heading", { name: h.nextLessonTitle })).toBeInTheDocument();
    expect(screen.queryByText(/held for you until/)).toBeNull();
    expect(screen.queryByRole("button", { name: en.booking.pendingReservationPay })).toBeNull();
  });
});
