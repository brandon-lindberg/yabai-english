// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingChecklist } from "../onboarding-checklist";

/**
 * Both flows render this. The teacher's rows carry controls and the student's
 * do not, and that difference decides whether the row itself is a link — which
 * is the part a future edit is most likely to break, in one flow only.
 */

const base = {
  percent: 50,
  progressLabel: "1 of 2 completed",
  completedLabel: "Completed",
  hint: "hint",
  actions: <button type="button">finish</button>,
  testIdPrefix: "x-onboarding",
};

describe("OnboardingChecklist row shapes", () => {
  test("a row with no controls is itself the link", () => {
    render(
      <OnboardingChecklist
        {...base}
        items={[
          { key: "profile", title: "Profile", body: "body", href: "/p", completed: false },
        ]}
      />,
    );

    const row = screen.getByTestId("step-card-profile");
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("href")).toBe("/p");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  test("a row with a checkbox is not a link, and opens via its own affordance", () => {
    render(
      <OnboardingChecklist
        {...base}
        openLabel="Open"
        items={[
          {
            key: "profile",
            title: "Profile",
            body: "body",
            href: "/p",
            completed: false,
            onToggle: () => {},
          },
        ]}
      />,
    );

    // A checkbox nested inside an anchor would be unreachable by keyboard.
    expect(screen.getByTestId("step-card-profile").tagName).not.toBe("A");
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/p");
    expect(screen.getByRole("checkbox", { name: "Profile" })).toBeTruthy();
  });

  test("toggling a checkbox row reports the new value", () => {
    const onToggle = vi.fn();
    render(
      <OnboardingChecklist
        {...base}
        openLabel="Open"
        items={[
          {
            key: "profile",
            title: "Profile",
            body: "body",
            href: "/p",
            completed: false,
            onToggle,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Profile" }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test("a step with no href is shown but not openable", () => {
    render(
      <OnboardingChecklist
        {...base}
        items={[
          { key: "placement", title: "Placement", body: "body", href: null, completed: false },
        ]}
      />,
    );

    const row = screen.getByTestId("step-card-placement");
    expect(row.tagName).toBe("LI");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Placement")).toBeTruthy();
  });
});

describe("OnboardingChecklist completion", () => {
  test("completed rows carry a label, not only a mark", () => {
    render(
      <OnboardingChecklist
        {...base}
        items={[
          { key: "profile", title: "Profile", body: "body", href: "/p", completed: true },
        ]}
      />,
    );

    // WCAG 1.4.1: the tick alone would encode state in a glyph and a fill.
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByTestId("step-status-profile").dataset.completed).toBe("true");
    expect(screen.getByTestId("step-card-profile").getAttribute("aria-label")).toBe(
      "Profile (Completed)",
    );
  });

  test("the progress bar announces its value", () => {
    render(
      <OnboardingChecklist
        {...base}
        items={[
          { key: "profile", title: "Profile", body: "body", href: "/p", completed: true },
        ]}
      />,
    );

    const bar = screen.getByTestId("x-onboarding-progress-bar");
    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("aria-valuetext")).toBe("1 of 2 completed");
  });
});
