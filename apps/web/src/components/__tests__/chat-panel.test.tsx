// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "student-1", role: "STUDENT" } },
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

import { ChatPanel } from "../chat-panel";

function threadsPayload(unreadCount: number) {
  return [
    {
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      twoWayEnabled: true,
      studentBlockedAt: null,
      teacherBlockedAt: null,
      studentReportedAt: null,
      teacherReportedAt: null,
      studentReportReason: null,
      teacherReportReason: null,
      unreadCount,
      studentName: "Student One",
      studentEmail: null,
      teacherName: "Teacher One",
      teacherEmail: null,
      counterpartName: "Teacher One",
      latestMessage: unreadCount > 0 ? "hello" : null,
      latestMessageAt: unreadCount > 0 ? new Date().toISOString() : null,
    },
  ];
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe("ChatPanel unread badge refresh", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    subscribeRealtimeMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    // jsdom doesn't implement scrollIntoView, but the chat panel calls it when
    // messages load. Stub it to a no-op so open-panel flows don't crash.
    const proto = Element.prototype as unknown as {
      scrollIntoView?: () => void;
    };
    if (typeof proto.scrollIntoView !== "function") {
      proto.scrollIntoView = function scrollIntoViewStub() {};
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("refreshes unread count when a realtime chat:update event fires", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(threadsPayload(0));
      }
      return jsonResponse([]);
    });

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <ChatPanel />
        </NextIntlClientProvider>,
      );
    });

    await waitFor(
      () => {
        expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
    expect(subscribeRealtimeMock).toHaveBeenCalled();

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(threadsPayload(2));
      }
      return jsonResponse([]);
    });

    // Simulate the server publishing a chat:update over SSE.
    await act(async () => {
      getLastHandlers()?.onChatUpdate({ threadId: "thread-1" });
    });

    const badge = await screen.findByTestId("unread-badge");
    expect(badge).toHaveTextContent("2");
  });

  test("does not poll the threads endpoint on an interval", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
          return jsonResponse(threadsPayload(0));
        }
        return jsonResponse([]);
      });

      await act(async () => {
        render(
          <NextIntlClientProvider locale="en" messages={en}>
            <ChatPanel />
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

      // Advance well past any reasonable polling cadence. With push-only the
      // number of fetches must not grow.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });

      expect(fetchMock.mock.calls.length).toBe(callsAfterMount);
    } finally {
      vi.useRealTimers();
    }
  });

  test("does not auto-mark messages as read when the chat panel is closed", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(threadsPayload(1));
      }
      return jsonResponse([]);
    });

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <ChatPanel />
        </NextIntlClientProvider>,
      );
    });

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/api/chat/threads"),
        );
      },
      { timeout: 2000 },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const messagesCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/messages");
    });
    expect(messagesCalls).toHaveLength(0);

    const badge = await screen.findByTestId("unread-badge");
    expect(badge).toHaveTextContent("1");
  });

  test("loads messages (marking them read) when the user opens the panel", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(threadsPayload(1));
      }
      if (url.includes("/messages")) {
        return jsonResponse([]);
      }
      return jsonResponse([]);
    });

    await act(async () => {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <ChatPanel />
        </NextIntlClientProvider>,
      );
    });

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/api/chat/threads"),
        );
      },
      { timeout: 2000 },
    );

    const fab = await screen.findByRole("button", { name: /open/i });
    await act(async () => {
      fireEvent.click(fab);
    });

    await waitFor(
      () => {
        const messagesCalls = fetchMock.mock.calls.filter(([input]) => {
          const url = typeof input === "string" ? input : String(input);
          return url.includes("/messages");
        });
        expect(messagesCalls.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });
});
