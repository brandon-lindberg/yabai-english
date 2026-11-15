// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ pathname: vi.fn(), session: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ usePathname: mocks.pathname }));
vi.mock("@/hooks/use-verified-session", () => ({ useVerifiedSession: mocks.session }));
vi.mock("@/components/chat-panel", () => ({ ChatPanel: () => <button>Messages</button> }));
import { AppChatPanel } from "@/components/app-chat-panel";
beforeEach(() => mocks.session.mockReturnValue({ data: { user: { id: "learner" } }, status: "authenticated" }));
afterEach(cleanup);
test.each(["/japanese-placement", "/placement", "/learn/study/BEGINNER_1/assessment"])("keeps chat out of assessment controls and results: %s", pathname => {
  mocks.pathname.mockReturnValue(pathname);
  render(<AppChatPanel />);
  expect(screen.queryByRole("button", { name: "Messages" })).toBeNull();
});
test.each(["unauthenticated", "loading"])("does not mount chat or its thread requests for %s visitors", status => {
  mocks.pathname.mockReturnValue("/learn-english");
  mocks.session.mockReturnValue({ data: null, status });
  render(<AppChatPanel />);
  expect(screen.queryByRole("button", { name: "Messages" })).toBeNull();
});
test("retains chat outside assessments and unmounts it on navigation or confirmed sign-out", async () => {
  mocks.pathname.mockReturnValue("/dashboard");
  const view = render(<AppChatPanel />);
  expect(await screen.findByRole("button", { name: "Messages" })).toBeVisible();
  mocks.pathname.mockReturnValue("/placement");
  view.rerender(<AppChatPanel />);
  expect(screen.queryByRole("button", { name: "Messages" })).toBeNull();
  mocks.pathname.mockReturnValue("/dashboard");
  view.rerender(<AppChatPanel />);
  expect(await screen.findByRole("button", { name: "Messages" })).toBeVisible();
  mocks.session.mockReturnValue({ data: null, status: "unauthenticated" });
  view.rerender(<AppChatPanel />);
  expect(screen.queryByRole("button", { name: "Messages" })).toBeNull();
});
