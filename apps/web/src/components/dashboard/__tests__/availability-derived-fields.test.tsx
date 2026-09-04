// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherAvailabilityAddModal } from "../teacher-availability-add-modal";

/*
  Lesson level and lesson type are not fields — they are consequences of the
  class the teacher picked above them. They were rendered as disabled inputs,
  and `disabled` in this system means 40% opacity: the treatment reserved for
  something unavailable. So a level that had been correctly chosen was drawn in
  the vocabulary of a level that had not, and read as an empty placeholder.
*/

const props = {
  open: true,
  dayKey: "2026-08-25",
  locale: "en",
  initialTimezone: "Asia/Tokyo",
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: "Add availability",
  subtitle: "Pick a time",
  cancelLabel: "Cancel",
  confirmLabel: "Save",
  dayOfWeekLabel: "Day of week",
  startLabel: "Start",
  endLabel: "End",
  timezoneLabel: "Timezone",
  classLevels: [{ id: "l1", code: "ADV", labelEn: "Advanced", labelJa: null }],
  classTypes: [{ id: "t1", code: "CONV", labelEn: "Conversation", labelJa: null }],
  lessonOfferings: [
    {
      id: "o1",
      durationMin: 40,
      rateYen: 3000,
      isGroup: false,
      groupSize: null,
      isFreeTrial: false,
      classLevelId: "l1",
      classTypeId: "t1",
      classLevel: { id: "l1", code: "ADV", labelEn: "Advanced", labelJa: null },
      classType: { id: "t1", code: "CONV", labelEn: "Conversation", labelJa: null },
    },
  ],
};

function renderModal() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityAddModal {...props} />
    </NextIntlClientProvider>,
  );
}

describe("the level and type that follow from the chosen class", () => {
  test("shows what the chosen class implies", () => {
    renderModal();

    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("Conversation")).toBeInTheDocument();
  });

  test("does not draw them as unavailable controls", () => {
    // `disabled` renders at 40% opacity here, which is how a correct value came
    // to look like an empty one.
    const { container } = renderModal();

    for (const el of container.querySelectorAll("input:disabled")) {
      expect((el as HTMLInputElement).value).not.toBe("Advanced");
      expect((el as HTMLInputElement).value).not.toBe("Conversation");
    }
  });

  test("still names them, so the values are not floating text", () => {
    renderModal();

    expect(
      screen.getByText(en.dashboard.teacherAvailability.lessonLevel),
    ).toBeInTheDocument();
    expect(screen.getByText(en.dashboard.teacherAvailability.lessonType)).toBeInTheDocument();
  });
});
