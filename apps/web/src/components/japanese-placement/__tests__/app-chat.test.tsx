// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ usePathname: mocks.pathname }));
vi.mock("@/components/chat-panel", () => ({ ChatPanel: () => <button>Messages</button> }));
import { AppChatPanel } from "@/components/app-chat-panel";
afterEach(cleanup);
test("keeps floating chat from obscuring assessment controls and results", () => {
  mocks.pathname.mockReturnValue("/japanese-placement");
  render(<AppChatPanel />);
  expect(screen.queryByRole("button", { name: "Messages" })).toBeNull();
});
test("retains chat on the rest of the app", () => {
  mocks.pathname.mockReturnValue("/dashboard");
  render(<AppChatPanel />);
  expect(screen.getByRole("button", { name: "Messages" })).toBeVisible();
});
