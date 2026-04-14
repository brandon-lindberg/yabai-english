// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ChatModerationMenu } from "../chat-moderation-menu";

describe("ChatModerationMenu", () => {
  test("opens from trigger and lists moderation actions", () => {
    const onBlock = vi.fn();
    const onUnblock = vi.fn();
    const onReport = vi.fn();

    render(
      <ChatModerationMenu
        menuAriaLabel="More actions"
        blockLabel="Block user"
        unblockLabel="Unblock"
        reportLabel="Block & report"
        blockDisabled={false}
        unblockDisabled
        reportDisabled={false}
        onBlock={onBlock}
        onUnblock={onUnblock}
        onReport={onReport}
      />,
    );

    const trigger = screen.getByRole("button", { name: "More actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Block user" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Unblock" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Block & report" })).toBeInTheDocument();
  });

  test("invokes callback and closes on item click", () => {
    const onBlock = vi.fn();

    render(
      <ChatModerationMenu
        menuAriaLabel="More actions"
        blockLabel="Block user"
        unblockLabel="Unblock"
        reportLabel="Block & report"
        blockDisabled={false}
        unblockDisabled
        reportDisabled={false}
        onBlock={onBlock}
        onUnblock={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Block user" }));

    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
