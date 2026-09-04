// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { TeacherBrowseList } from "@/components/teacher-browse-list";

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

/*
  The list keeps its rules and its price column — the whole reason it stopped
  being a card grid — and the availability moves to a panel beside it that
  follows whichever teacher you are looking at.

  "Looking at" has to mean focus as well as hover, or the panel is unreachable
  from a keyboard and invisible to anyone not using a mouse.
*/

const days = [{ dayKey: "2026-09-07", shortLabel: "Mo", dayOfMonth: "7" }];
const filled = [[false, false, true, false, false, false]];
const empty = [[false, false, false, false, false, false]];

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherBrowseList
        timeZone="Asia/Tokyo"
        previews={{
          "t-1": { days, grid: filled, profileHref: "/book/teachers/t-1" },
          "t-2": { days, grid: empty, profileHref: "/book/teachers/t-2" },
        }}
      >
        <li data-row-id="t-1">
          <button type="button">Mika Sato</button>
        </li>
        <li data-row-id="t-2">
          <button type="button">Aoi Tanaka</button>
        </li>
      </TeacherBrowseList>
    </NextIntlClientProvider>,
  );
}

const panel = () => screen.queryByTestId("availability-panel");

describe("TeacherBrowseList", () => {
  test("renders the rows it is given", () => {
    renderList();

    expect(screen.getByText("Mika Sato")).toBeInTheDocument();
    expect(screen.getByText("Aoi Tanaka")).toBeInTheDocument();
  });

  test("shows nothing until a teacher is picked out", () => {
    // A panel that is always there, quietly changing, reads as part of the
    // furniture rather than as an answer about the teacher under the pointer.
    renderList();

    expect(panel()).toBeNull();
  });

  test("follows the pointer to another teacher", () => {
    renderList();

    fireEvent.mouseOver(screen.getByText("Aoi Tanaka"));

    expect(
      screen.getByRole("link", { name: en.booking.availabilityPreviewFullSchedule }),
    ).toHaveAttribute("href", "/book/teachers/t-2");
  });

  test("follows the keyboard too", () => {
    // Hover alone would make this panel unreachable without a mouse.
    renderList();

    fireEvent.focusIn(screen.getByText("Aoi Tanaka"));

    expect(
      screen.getByRole("link", { name: en.booking.availabilityPreviewFullSchedule }),
    ).toHaveAttribute("href", "/book/teachers/t-2");
  });

  test("survives the pointer moving off the rows and onto the panel", () => {
    // Reaching "View full schedule" means leaving the list, so treating that
    // as "nothing is selected" made the link impossible to click.
    renderList();
    fireEvent.mouseOver(screen.getByText("Mika Sato"));

    // `relatedTarget` is where the pointer went. Leaving the rows *for the
    // panel* is not leaving the region, and React decides that from this — a
    // leave with no relatedTarget means it left to nowhere.
    fireEvent.mouseLeave(screen.getByTestId("teacher-rows"), {
      relatedTarget: screen.getByTestId("availability-column"),
    });

    expect(panel()).toBeInTheDocument();
  });

  test("goes away when the pointer leaves the list and the panel together", () => {
    renderList();
    fireEvent.mouseOver(screen.getByText("Mika Sato"));
    expect(panel()).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId("browse-region"));

    expect(panel()).toBeNull();
  });

  test("lines the panel up with the row it describes", () => {
    // It used to pin to the top of the viewport, so hovering the last teacher
    // put the answer level with the first.
    renderList();
    const region = screen.getByTestId("browse-region");
    const second = screen.getByText("Aoi Tanaka").closest("li")!;
    region.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    second.getBoundingClientRect = () => ({ top: 340 }) as DOMRect;

    fireEvent.mouseOver(screen.getByText("Aoi Tanaka"));

    expect(screen.getByTestId("availability-column")).toHaveStyle({ paddingTop: "240px" });
  });

  test("goes away when focus leaves the list", () => {
    renderList();
    fireEvent.focusIn(screen.getByText("Mika Sato"));
    expect(panel()).toBeInTheDocument();

    fireEvent.focusOut(screen.getByTestId("browse-region"), { relatedTarget: document.body });

    expect(panel()).toBeNull();
  });

  test("stays put while moving between rows", () => {
    // Tabbing down the list must not flicker the panel off and on between
    // every pair of rows.
    renderList();
    const second = screen.getByText("Aoi Tanaka");
    fireEvent.focusIn(screen.getByText("Mika Sato"));

    fireEvent.focusOut(screen.getByText("Mika Sato"), { relatedTarget: second });
    fireEvent.focusIn(second);

    expect(panel()).toBeInTheDocument();
  });

  test("arrives already in place, rather than sliding in from the top", () => {
    /*
      The panel's offset starts at zero, so animating its first appearance sent
      it travelling down from the top of the list past every row to reach you —
      and you could catch it anywhere along the way. Appearing is instant.
    */
    renderList();

    fireEvent.mouseOver(screen.getByText("Aoi Tanaka"));

    expect(screen.getByTestId("availability-column").className).not.toMatch(/transition/);
  });

  test("slides when moving from one row to another", () => {
    // Once it is on screen the movement is worth seeing: it ties the panel to
    // the row you moved to.
    renderList();
    fireEvent.mouseOver(screen.getByText("Mika Sato"));

    fireEvent.mouseOver(screen.getByText("Aoi Tanaka"));

    expect(screen.getByTestId("availability-column").className).toMatch(/transition/);
  });

  test("a fresh appearance after leaving does not slide either", () => {
    // Leaving and coming back is an arrival, not a move.
    renderList();
    fireEvent.mouseOver(screen.getByText("Mika Sato"));
    fireEvent.mouseOver(screen.getByText("Aoi Tanaka"));

    fireEvent.mouseLeave(screen.getByTestId("browse-region"));
    fireEvent.mouseOver(screen.getByText("Mika Sato"));

    expect(screen.getByTestId("availability-column").className).not.toMatch(/transition/);
  });

  test("keeps the column reserved, so the list does not jump", () => {
    // The panel appears and disappears on hover. If it took its width with it,
    // every row would reflow under the pointer.
    renderList();

    expect(screen.getByTestId("availability-column")).toBeInTheDocument();
  });

  test("the panel is a companion, not an announcement", () => {
    // It changes as the pointer moves across a list. Announcing every change
    // would make the list unusable with a screen reader, so it is marked as
    // supplementary and the row itself stays the thing being read.
    renderList();
    fireEvent.mouseOver(screen.getByText("Mika Sato"));

    expect(panel()).toHaveAttribute("aria-live", "off");
  });
});

describe("TeacherBrowseList header", () => {
  test("puts the header in the list's column, not beside it", () => {
    /*
      The guest notice — "11 teachers" and the sign-in link — describes the
      list, so it has to line up with the list. Rendered as a sibling above the
      whole region it stretched to the page's full width instead, which put its
      right-hand link out over the availability column: 300px clear of the rows
      it belonged to, floating in the space the panel only occupies on hover.
    */
    const { getByTestId } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherBrowseList
          timeZone="Asia/Tokyo"
          previews={{}}
          header={<p data-testid="browse-header">11 teachers</p>}
        >
          <li data-row-id="t-1">Mika Sato</li>
        </TeacherBrowseList>
      </NextIntlClientProvider>,
    );

    const header = getByTestId("browse-header");
    expect(getByTestId("teacher-rows")).toContainElement(header);
    expect(getByTestId("availability-column")).not.toContainElement(header);
    // Above the rows, not after them.
    expect(header.compareDocumentPosition(getByTestId("teacher-rows").querySelector("ul")!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
