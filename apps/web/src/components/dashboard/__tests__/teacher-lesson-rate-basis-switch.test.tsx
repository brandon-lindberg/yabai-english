// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherLessonRateBasisSwitch } from "../teacher-lesson-rate-basis-switch";
import type { TeacherLessonRatePriceBasis } from "@/lib/teacher-lesson-rate-basis";

const p = en.dashboard.profilePage;

function renderSwitch(
  basis: TeacherLessonRatePriceBasis = "tax_included",
  onChange = vi.fn(),
) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherLessonRateBasisSwitch
        basis={basis}
        onChange={onChange}
      />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("TeacherLessonRateBasisSwitch", () => {
  // A link offering only the mode you are *not* in reads as a footnote. Both
  // options are on screen, and this decides whether ¥20,000 means ¥20,000 or
  // ¥22,000 — so it has to be visible as a control.
  test("shows both ways of entering a price, not just the other one", () => {
    renderSwitch();

    expect(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionIncluded }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    ).toBeInTheDocument();
  });

  test("marks the current one as chosen", () => {
    renderSwitch("tax_included");

    expect(screen.getByRole("radio", { name: p.teacherRateBasisOptionIncluded })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    ).not.toBeChecked();
  });

  test("marks the pre-tax option when that is the mode", () => {
    renderSwitch("tax_exclusive");

    expect(screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive })).toBeChecked();
  });

  test("reports the option the teacher picked", () => {
    const onChange = renderSwitch("tax_included");

    fireEvent.click(screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }));

    expect(onChange).toHaveBeenCalledWith("tax_exclusive");
  });

  // Named for what it does, not for the field beside it — that field is now
  // called "Tax included", which is also one of these options.
  test("names itself, for anyone not looking at the screen", () => {
    renderSwitch();

    expect(
      screen.getByRole("group", { name: p.teacherRateBasisLegend }),
    ).toBeInTheDocument();
  });

  // The rates page renders one of these per class. A shared radio name would
  // make every row fight over one selection.
  test("keeps each class's toggle independent of the others", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <div data-testid="row-a">
          <TeacherLessonRateBasisSwitch
            basis="tax_included"
            onChange={first}
          />
        </div>
        <div data-testid="row-b">
          <TeacherLessonRateBasisSwitch
            basis="tax_exclusive"
            onChange={second}
          />
        </div>
      </NextIntlClientProvider>,
    );

    const a = within(screen.getByTestId("row-a"));
    const b = within(screen.getByTestId("row-b"));

    // Both hold their own selection at once, which a shared name forbids.
    expect(a.getByRole("radio", { name: p.teacherRateBasisOptionIncluded })).toBeChecked();
    expect(b.getByRole("radio", { name: p.teacherRateBasisOptionExclusive })).toBeChecked();

    fireEvent.click(a.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }));
    expect(first).toHaveBeenCalledWith("tax_exclusive");
    expect(second).not.toHaveBeenCalled();
  });
});
