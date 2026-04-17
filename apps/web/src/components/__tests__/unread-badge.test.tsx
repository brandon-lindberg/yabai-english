// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnreadBadge } from "../unread-badge";

describe("UnreadBadge", () => {
  test("renders the unread count when greater than zero", () => {
    render(<UnreadBadge count={3} />);
    const badge = screen.getByTestId("unread-badge");
    expect(badge).toHaveTextContent("3");
  });

  test("renders nothing when the count is zero or negative", () => {
    const { container, rerender } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<UnreadBadge count={-2} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("caps large counts at 99+ like iMessage", () => {
    render(<UnreadBadge count={128} />);
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("99+");
  });

  test("exposes an accessible label including the count", () => {
    render(<UnreadBadge count={5} label={(n) => `${n} unread messages`} />);
    expect(screen.getByLabelText("5 unread messages")).toBeInTheDocument();
  });
});
