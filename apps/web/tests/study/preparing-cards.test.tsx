// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StudyPracticeLoading } from "@/components/study/study-practice-parts";

test("preparing cards shows a named measured bar, with no invented percentage before work is known", () => {
  const { rerender } = render(<StudyPracticeLoading label="Preparing your cards…" />);
  expect(screen.getByText("Preparing your cards…")).toBeVisible();
  expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  rerender(<StudyPracticeLoading label="Preparing your cards…" progress={{completed:7,total:25}} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","28");
  expect(screen.getByText("28%")).toBeVisible();
});
