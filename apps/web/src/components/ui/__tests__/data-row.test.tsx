// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DataRow } from "@/components/ui/data-row";

/*
  An interactive row has to show which one you are on — and "on" means the
  pointer or the keyboard. Hover alone leaves someone tabbing down the list
  with no idea which row they are answering about, which matters more now that
  a row also drives the panel beside it.
*/

function row(interactive = true) {
  render(
    <DataRow interactive={interactive} dataId="t-1">
      <button type="button">Mika Sato</button>
    </DataRow>,
  );
  return screen.getByText("Mika Sato").closest("li")!;
}

describe("DataRow", () => {
  test("marks itself for a delegated handler", () => {
    expect(row()).toHaveAttribute("data-row-id", "t-1");
  });

  test("answers the pointer", () => {
    expect(row().className).toContain("hover:bg-");
  });

  test("answers the keyboard too", () => {
    // `focus-within`, not `focus`: what receives focus is the control inside
    // the row, never the row itself.
    expect(row().className).toContain("focus-within:bg-");
  });

  test("a plain row does neither", () => {
    expect(row(false).className).not.toContain("hover:bg-");
  });
});
