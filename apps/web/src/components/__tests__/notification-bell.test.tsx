// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1", role: "STUDENT" } },
    update: vi.fn(),
  }),
}));

type Handlers = {
  onChatUpdate: (payload: { threadId?: string }) => void;
  onNotificationsUpdate: () => void;
  onConnected: () => void;
};

const { subscribeRealtimeMock, getLastHandlers } = vi.hoisted(() => {
  const state: { handlers: Handlers | null } = { handlers: null };
  const mock = vi.fn((handlers: Handlers) => {
    state.handlers = handlers;
    return () => {
      state.handlers = null;
    };
  });
  return {
    subscribeRealtimeMock: mock,
    getLastHandlers: () => state.handlers,
  };
});

vi.mock("@/lib/realtime-client", () => ({
  subscribeRealtime: subscribeRealtimeMock,
}));

import { NotificationBell } from "../notification-bell";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe("NotificationBell", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    subscribeRealtimeMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("refreshes when a realtime notifications:update event fires", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ items: [], unreadCount: 0 }),
    );

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <NotificationBell />
        </NextIntlClientProvider>,
      );
    });

    await waitFor(
      () => {
        expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );

    const initialCalls = fetchMock.mock.calls.length;

    fetchMock.mockImplementation(async () =>
      jsonResponse({
        items: [
          {
            id: "n-1",
            titleJa: "新着",
            titleEn: "New",
            bodyJa: null,
            bodyEn: null,
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 3,
      }),
    );

    await act(async () => {
      getLastHandlers()?.onNotificationsUpdate();
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  test("does not poll the notifications endpoint on an interval", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      fetchMock.mockImplementation(async () =>
        jsonResponse({ items: [], unreadCount: 0 }),
      );

      await act(async () => {
        render(
          <NextIntlClientProvider locale="en" messages={en}>
            <NotificationBell />
          </NextIntlClientProvider>,
        );
      });

      await waitFor(
        () => {
          expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      const callsAfterMount = fetchMock.mock.calls.length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });

      expect(fetchMock.mock.calls.length).toBe(callsAfterMount);
    } finally {
      vi.useRealTimers();
    }
  });

  test("closes the panel when pointerdown happens outside the bell", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ items: [], unreadCount: 0 }),
    );

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <div>
            <button type="button">outside-target</button>
            <NotificationBell />
          </div>
        </NextIntlClientProvider>,
      );
    });

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(0));

    // Matched loosely: the bell's accessible name carries the unread count
    // ("Notifications (2 unread)") so a screen reader hears it without opening
    // the panel. This test is about open/close, not the wording.
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText(en.common.markAllRead)).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "outside-target" }));

    await waitFor(() => {
      expect(screen.queryByText(en.common.markAllRead)).not.toBeInTheDocument();
    });
  });

  test("a notification with a link is clickable through to it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "n-1",
            titleJa: "返金の対応が必要です",
            titleEn: "A refund needs attention",
            bodyJa: null,
            bodyEn: "¥5,000 for Aki could not be refunded automatically.",
            href: "/admin/payments",
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <NotificationBell />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /notification/i }));

    const link = await screen.findByRole("link", { name: /A refund needs attention/i });
    expect(link.getAttribute("href")).toContain("/admin/payments");
  });

  test("a notification without a link stays plain text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "n-2",
            titleJa: "お知らせ",
            titleEn: "Lesson confirmed",
            bodyJa: null,
            bodyEn: null,
            href: null,
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <NotificationBell />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /notification/i }));

    expect(await screen.findByText("Lesson confirmed")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Lesson confirmed/i })).toBeNull();
  });

  test("keeps the dropdown inside the viewport on mobile", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ items: [], unreadCount: 0 }),
    );

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <NotificationBell />
        </NextIntlClientProvider>,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    });

    const panel = screen.getByTestId("notification-panel");
    // The bell is not at the screen edge (the account menu sits to its right),
    // so a fixed width anchored to the bell hangs off the left of the screen.
    // Below `sm` the panel spans the viewport instead; the fixed width and the
    // right-anchoring are both gated behind `sm:`.
    expect(panel.className).toContain("inset-x-3");
    expect(panel.className).toContain("sm:w-80");
    expect(panel.className).not.toMatch(/(^|\s)w-80(\s|$)/);
    expect(panel.className).not.toMatch(/(^|\s)right-0(\s|$)/);
  });
});
