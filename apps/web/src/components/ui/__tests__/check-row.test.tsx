// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CheckRow } from "../check-row";

describe("CheckRow", () => {
  test("clicking the label text toggles the box", () => {
    const onChange = vi.fn();
    render(
      <CheckRow checked={false} onChange={onChange}>
        Lesson reminders
      </CheckRow>,
    );

    fireEvent.click(screen.getByText("Lesson reminders"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("the box clears the 24px pointer target floor", () => {
    // WCAG 2.5.8. The hand-built rows this replaces were at the browser default.
    render(
      <CheckRow checked={false} onChange={() => {}}>
        Messages
      </CheckRow>,
    );

    const box = screen.getByRole("checkbox");
    expect(box.className).toContain("h-5");
    expect(box.className).toContain("w-5");
    expect(box.closest("label")?.className).toContain("min-h-11");
  });

  test("a disabled row disables the control, not just its look", () => {
    render(
      <CheckRow checked={false} disabled onChange={() => {}}>
        Payments
      </CheckRow>,
    );

    expect(screen.getByRole("checkbox").hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("checkbox").closest("label")?.className).toContain(
      "cursor-not-allowed",
    );
  });
});
