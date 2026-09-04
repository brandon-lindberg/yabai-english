// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { TeacherCard } from "@/components/teacher-card";
import type { TeacherCard as TeacherCardData } from "@/lib/teacher-discovery";

/*
  "Free trial available" was drawn with the `open` mark — which the status
  ladder defines as "a slot that exists but holds nothing yet". A small dashed
  square beside those words reads as an unticked checkbox, and muted grey text
  reads as inactive, so the badge said the opposite of what it meant.

  The badge only renders when the teacher *does* offer a trial, so the mark can
  never take a second value. It carries no information; all it can do is
  mislead. It states a fact, so it takes the mark for a fact.
*/

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async () => {
    const messages = en.booking as Record<string, string>;
    return (key: string) => messages[key] ?? key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

const teacher = {
  id: "t-1",
  displayName: "Brandon Lindberg",
  countryOfOrigin: "Canada",
  instructionLanguages: ["EN"],
  specialties: ["Conversation", "Pronunciation"],
  lowestRateYen: 3000,
  openSlotCount: 6,
  avatarUrl: null,
  offersBookableFreeTrial: true,
} as unknown as TeacherCardData;

async function renderCard(overrides: Partial<TeacherCardData> = {}) {
  return render(await TeacherCard({ teacher: { ...teacher, ...overrides } }));
}

function badge() {
  return screen.getByText(en.booking.freeTrialAvailable);
}

describe("TeacherCard — the free trial badge", () => {
  test("says a free trial is available", async () => {
    await renderCard();

    expect(badge()).toBeInTheDocument();
  });

  test("does not draw it as an empty slot", async () => {
    // A dashed outline is the ladder's "nothing here yet".
    await renderCard();

    const mark = badge().querySelector("span[aria-hidden='true']");
    expect(mark?.className ?? "").not.toContain("border-dashed");
  });

  test("does not mute it into looking switched off", async () => {
    await renderCard();

    expect(badge().className).not.toContain("text-muted");
  });

  test("is absent entirely when no trial is offered", async () => {
    // Which is why the mark could never have distinguished the two cases.
    await renderCard({ offersBookableFreeTrial: false });

    expect(screen.queryByText(en.booking.freeTrialAvailable)).toBeNull();
  });
});
