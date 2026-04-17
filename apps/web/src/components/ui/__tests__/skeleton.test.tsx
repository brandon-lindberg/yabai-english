// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "../skeleton";

describe("Skeleton primitive", () => {
  test("renders with shimmer animation and is hidden from a11y tree", () => {
    render(<Skeleton />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("app-skeleton");
  });

  test("accepts width/height/rounded shortcuts", () => {
    render(<Skeleton width="1/2" height="10" rounded="full" />);
    const el = screen.getByTestId("skeleton");
    expect(el.className).toContain("w-1/2");
    expect(el.className).toContain("h-10");
    expect(el.className).toContain("rounded-full");
  });
});

describe("SkeletonText", () => {
  test("renders the requested number of lines", () => {
    const { container } = render(<SkeletonText lines={4} />);
    const rows = container.querySelectorAll("[data-testid='skeleton']");
    expect(rows.length).toBe(4);
  });

  test("last line is narrower to look like prose", () => {
    const { container } = render(
      <SkeletonText lines={3} lastLineWidth="1/2" />,
    );
    const rows = container.querySelectorAll("[data-testid='skeleton']");
    expect(rows[rows.length - 1].className).toContain("w-1/2");
    expect(rows[0].className).toContain("w-full");
  });

  test("single-line renders full width without narrowing", () => {
    const { container } = render(<SkeletonText lines={1} />);
    const rows = container.querySelectorAll("[data-testid='skeleton']");
    expect(rows.length).toBe(1);
    expect(rows[0].className).toContain("w-full");
  });
});

describe("SkeletonAvatar", () => {
  test("renders a circular block at the requested size", () => {
    render(<SkeletonAvatar size="lg" />);
    const el = screen.getByTestId("skeleton-avatar");
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("h-14");
    expect(el.className).toContain("w-14");
    expect(el.className).toContain("app-skeleton");
  });
});

describe("SkeletonButton", () => {
  test("renders as a pill-shaped skeleton", () => {
    render(<SkeletonButton width="1/4" />);
    const el = screen.getByTestId("skeleton");
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("h-10");
    expect(el.className).toContain("w-1/4");
  });
});

describe("SkeletonCard", () => {
  test("mirrors AppCard surface classes and renders default content", () => {
    render(<SkeletonCard />);
    const el = screen.getByTestId("skeleton-card");
    expect(el.className).toContain("bg-surface");
    expect(el.className).toContain("border-border");
    expect(el.className).toContain("rounded-2xl");
  });

  test("renders custom children when provided", () => {
    render(
      <SkeletonCard>
        <p data-testid="custom-content">hi</p>
      </SkeletonCard>,
    );
    expect(screen.getByTestId("custom-content")).toBeInTheDocument();
  });
});
