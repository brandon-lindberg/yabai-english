// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherAvailabilityAddModal } from "../teacher-availability-add-modal";
import { TeacherAvailabilityScopeModal } from "../teacher-availability-scope-modal";

/*
  A reported bug: on a short viewport the availability form ran off the top and
  bottom of the screen and neither end could be reached, so Save was
  unclickable and the availability could not be saved at all. The overlay is
  `fixed inset-0` and centres its panel, so anything taller than the viewport
  overflows in both directions with nothing to scroll.

  jsdom has no layout engine, so this asserts the structural contract that
  makes scrolling possible rather than measuring pixels.
*/

const addProps = {
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
  classLevels: [{ id: "l1", code: "BEG", labelEn: "Beginner", labelJa: null }],
  classTypes: [{ id: "t1", code: "CONV", labelEn: "Conversation", labelJa: null }],
  lessonOfferings: [
    {
      id: "o1",
      durationMin: 20,
      rateYen: 0,
      isGroup: false,
      groupSize: null,
      isFreeTrial: true,
      classLevelId: "l1",
      classTypeId: "t1",
      classLevel: { id: "l1", code: "BEG", labelEn: "Beginner", labelJa: null },
      classType: { id: "t1", code: "CONV", labelEn: "Conversation", labelJa: null },
    },
  ],
};

function renderAdd() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityAddModal {...addProps} />
    </NextIntlClientProvider>,
  );
}

/** The element that actually holds the form content inside the overlay. */
function panelOf(dialog: HTMLElement) {
  return dialog.querySelector("[data-modal-panel]") as HTMLElement | null;
}

describe("availability modals fit the viewport", () => {
  test("the add form can scroll to reach its Save button", () => {
    renderAdd();

    const panel = panelOf(screen.getByRole("dialog"));
    expect(panel, "no identifiable modal panel").not.toBeNull();
    expect(panel!.className).toMatch(/overflow-y-auto/);
    expect(panel!.className).toMatch(/max-h-/);
  });

  test("the remove confirmation can scroll too", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherAvailabilityScopeModal
          open
          onClose={vi.fn()}
          canApplyToThisOccurrence
          busy={false}
          error={null}
          title="Remove availability"
          description="Choose what to remove"
          thisOccurrenceLabel="This occurrence"
          allSeriesLabel="All in series"
          cancelLabel="Cancel"
          onThisOccurrence={vi.fn()}
          onAllSeries={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    const panel = panelOf(screen.getByRole("dialog"));
    expect(panel, "no identifiable modal panel").not.toBeNull();
    expect(panel!.className).toMatch(/overflow-y-auto/);
    expect(panel!.className).toMatch(/max-h-/);
  });

  test("the page behind is locked while the form is open, and released after", () => {
    // The reported symptom was that scrolling moved the page instead of the
    // form. `body { overflow }` does not propagate to the viewport here,
    // because html already carries `overflow-x: clip`.
    const { unmount } = renderAdd();

    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
