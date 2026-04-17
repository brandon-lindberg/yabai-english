// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
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
});
