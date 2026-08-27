// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";

const { sessionState } = vi.hoisted(() => ({
  sessionState: {
    user: { id: "student-1", role: "STUDENT" } as { id: string; role: string },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: sessionState.user },
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
      participantUnreadCount: unreadCount,
      viewerCanSend: true,
      studentName: "Student One",
      studentEmail: null,
      studentIsAdmin: false,
      teacherName: "Teacher One",
      teacherEmail: null,
      teacherIsAdmin: false,
      counterpartName: "Teacher One",
      counterpartIsAdmin: false,
      latestMessage: unreadCount > 0 ? "hello" : null,
      latestMessageAt: unreadCount > 0 ? new Date().toISOString() : null,
    },
  ];
}


function adminThreadsPayload() {
  const base = {
    twoWayEnabled: true,
    studentBlockedAt: null,
    teacherBlockedAt: null,
    studentReportedAt: null,
    teacherReportedAt: null,
    studentReportReason: null,
    teacherReportReason: null,
    latestMessage: "hello",
    latestMessageAt: new Date().toISOString(),
  };
  return [
    {
      ...base,
      id: "thread-1",
      studentId: "student-1",
      teacherId: "teacher-1",
      unreadCount: 0,
      participantUnreadCount: 4,
      viewerCanSend: true,
      studentName: "Student One",
      studentEmail: null,
      studentIsAdmin: false,
      teacherName: "Teacher One",
      teacherEmail: null,
      teacherIsAdmin: false,
      counterpartName: "Student One · Teacher One",
      counterpartIsAdmin: false,
    },
    {
      ...base,
      id: "admin-teacher-thread",
      studentId: "admin-1",
      teacherId: "teacher-1",
      unreadCount: 3,
      participantUnreadCount: 3,
      viewerCanSend: true,
      studentName: null,
      studentEmail: null,
      studentIsAdmin: true,
      teacherName: "Teacher One",
      teacherEmail: null,
      teacherIsAdmin: false,
      counterpartName: "Teacher One",
      counterpartIsAdmin: false,
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
    sessionState.user = { id: "student-1", role: "STUDENT" };
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

describe("ChatPanel admin direct messaging", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionState.user = { id: "admin-1", role: "SUPER_ADMIN" };
    fetchMock.mockReset();
    subscribeRealtimeMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
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

  test("sends into the admin's own thread, never a student/teacher conversation", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/chat/threads/direct" && init?.method === "POST") {
        return jsonResponse({ threadId: "admin-teacher-thread" });
      }
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        // thread-1 here is a student/teacher conversation the admin is only
        // reviewing; admin-teacher-thread is the admin's own.
        return jsonResponse(adminThreadsPayload());
      }
      if (url.includes("/messages")) {
        return jsonResponse(init?.method === "POST" ? { id: "msg-1" } : []);
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Direct" }));
    });

    await act(async () => {
      fireEvent.click(await screen.findByTestId("admin-contact"));
    });

    const composer = await screen.findByLabelText("Type a message...");
    await act(async () => {
      fireEvent.change(composer, { target: { value: "Hello this is the Admin" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/threads/direct",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "teacher-1" }),
        }),
      );
    });

    const messagePosts = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/messages") && (init as RequestInit | undefined)?.method === "POST";
    });
    expect(messagePosts).toHaveLength(1);
    expect(String(messagePosts[0]?.[0])).toBe(
      "/api/chat/threads/admin-teacher-thread/messages",
    );
  });

  test("badges admin conversations with the admin's own unread messages", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
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

    // The floating badge only counts what is addressed to the admin.
    const fab = await screen.findByRole("button", { name: /open chat/i });
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("3");

    await act(async () => {
      fireEvent.click(fab);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "All" }));
    });

    const adminThreadRow = await screen.findByRole("button", {
      name: /Admin · Teacher One/,
    });
    expect(within(adminThreadRow).getByTestId("unread-badge")).toHaveTextContent("3");

    const thirdPartyRow = screen.getByRole("button", {
      name: /Student One · Teacher One/,
    });
    expect(within(thirdPartyRow).queryByTestId("unread-badge")).not.toBeInTheDocument();
  });

  test("never lists the admin's own account as a contact", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "All" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Students" }));
    });

    const contactNames = (await screen.findAllByTestId("admin-contact")).map(
      (el) => el.textContent,
    );
    expect(contactNames.some((name) => name?.includes("Student One"))).toBe(true);
    // The admin holds the student slot of their own thread with the teacher;
    // that slot is not a contact.
    expect(contactNames).toHaveLength(1);
    expect(contactNames.some((name) => name?.includes("Admin"))).toBe(false);
  });

  test("lets the admin reply in review mode only in threads they are part of", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "All" }));
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Admin · Teacher One/ }),
      );
    });
    expect(screen.getByTestId("chat-composer")).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Student One · Teacher One/ }),
      );
    });
    expect(screen.getByTestId("chat-composer")).toBeDisabled();
  });

  test("shows the conversation history with the selected contact", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/chat/threads/direct" && init?.method === "POST") {
        return jsonResponse({ threadId: "admin-teacher-thread" });
      }
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
      }
      if (url === "/api/chat/threads/admin-teacher-thread/messages") {
        return jsonResponse([
          {
            id: "m1",
            senderId: "admin-1",
            body: "Earlier note from the studio",
            readAt: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "m2",
            senderId: "teacher-1",
            body: "Thanks, understood",
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ]);
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

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /open chat/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Direct" }));
    });
    await act(async () => {
      fireEvent.click(await screen.findByTestId("admin-contact"));
    });

    // Direct mode is a real conversation, not a fire-and-forget composer.
    expect(await screen.findByText("Earlier note from the studio")).toBeInTheDocument();
    expect(screen.getByText("Thanks, understood")).toBeInTheDocument();
  });

  test("lets the admin close replies on a direct conversation", async () => {
    const permissionCalls: unknown[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/chat/threads/direct" && init?.method === "POST") {
        return jsonResponse({ threadId: "admin-teacher-thread" });
      }
      if (url.endsWith("/permissions") && init?.method === "POST") {
        permissionCalls.push({ url, body: init.body });
        return jsonResponse({ ok: true });
      }
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
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

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /open chat/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Direct" }));
    });
    await act(async () => {
      fireEvent.click(await screen.findByTestId("admin-contact"));
    });

    const toggle = await screen.findByRole("checkbox", {
      name: /Allow the recipient to reply/i,
    });
    expect(toggle).toBeChecked();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(permissionCalls).toEqual([
      {
        url: "/api/chat/threads/admin-teacher-thread/permissions",
        body: JSON.stringify({ twoWayEnabled: false }),
      },
    ]);
  });


  test("labels the admin's own messages 'Admin', not by the slot they occupy", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/chat/threads/direct" && init?.method === "POST") {
        return jsonResponse({ threadId: "admin-teacher-thread" });
      }
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadsPayload());
      }
      if (url === "/api/chat/threads/admin-teacher-thread/messages") {
        return jsonResponse([
          {
            id: "m1",
            senderId: "admin-1",
            body: "Studio announcement",
            readAt: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "m2",
            senderId: "teacher-1",
            body: "Got it",
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ]);
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

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /open chat/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Direct" }));
    });
    await act(async () => {
      fireEvent.click(await screen.findByTestId("admin-contact"));
    });

    // The admin holds the student slot of their own thread with a teacher, so
    // labelling by slot would call the admin "Student".
    const adminBubble = (await screen.findByText("Studio announcement")).closest("div")!
      .parentElement!;
    expect(adminBubble).toHaveTextContent("Admin");
    expect(adminBubble).not.toHaveTextContent("Student");

    const teacherBubble = screen.getByText("Got it").closest("div")!.parentElement!;
    expect(teacherBubble).toHaveTextContent("Teacher");
  });

});

describe("ChatPanel admin identity", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionState.user = { id: "student-1", role: "STUDENT" };
    fetchMock.mockReset();
    subscribeRealtimeMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    const proto = Element.prototype as unknown as { scrollIntoView?: () => void };
    if (typeof proto.scrollIntoView !== "function") {
      proto.scrollIntoView = function scrollIntoViewStub() {};
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("labels an admin counterpart 'Admin' rather than the person's name", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse([
          {
            id: "admin-thread",
            studentId: "student-1",
            teacherId: "admin-1",
            twoWayEnabled: true,
            studentBlockedAt: null,
            teacherBlockedAt: null,
            studentReportedAt: null,
            teacherReportedAt: null,
            studentReportReason: null,
            teacherReportReason: null,
            unreadCount: 1,
            participantUnreadCount: 1,
            studentName: "Student One",
            studentEmail: null,
            studentIsAdmin: false,
            teacherName: null,
            teacherEmail: null,
            teacherIsAdmin: true,
            counterpartName: null,
            counterpartIsAdmin: true,
            latestMessage: "Hello from the studio",
            latestMessageAt: new Date().toISOString(),
          },
        ]);
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });

    const row = await screen.findByRole("button", { name: /Hello from the studio/ });
    expect(row).toHaveTextContent("Admin");
    // "User" is the unknown-counterpart fallback; a missing name must not fall
    // through to it when we already know the counterpart is the admin.
    expect(row).not.toHaveTextContent("User");
  });

  test("hides the two-way toggle from a teacher in their admin conversation", async () => {
    sessionState.user = { id: "teacher-1", role: "TEACHER" };
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse([
          {
            id: "admin-thread",
            studentId: "admin-1",
            teacherId: "teacher-1",
            twoWayEnabled: true,
            studentBlockedAt: null,
            teacherBlockedAt: null,
            studentReportedAt: null,
            teacherReportedAt: null,
            studentReportReason: null,
            teacherReportReason: null,
            unreadCount: 0,
            participantUnreadCount: 0,
            studentName: null,
            studentEmail: null,
            studentIsAdmin: true,
            teacherName: "Teacher One",
            teacherEmail: null,
            teacherIsAdmin: false,
            counterpartName: null,
            counterpartIsAdmin: true,
            latestMessage: "This is the Admin",
            latestMessageAt: new Date().toISOString(),
          },
        ]);
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });

    await screen.findByText("This is the Admin");
    // Whether a conversation with the studio is two-way is the admin's call.
    expect(
      screen.queryByRole("checkbox", { name: /Enable two-way student chat/i }),
    ).not.toBeInTheDocument();
  });

  test("keeps the two-way toggle for a teacher in a student conversation", async () => {
    sessionState.user = { id: "teacher-1", role: "TEACHER" };
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse([
          {
            id: "student-thread",
            studentId: "student-1",
            teacherId: "teacher-1",
            twoWayEnabled: false,
            studentBlockedAt: null,
            teacherBlockedAt: null,
            studentReportedAt: null,
            teacherReportedAt: null,
            studentReportReason: null,
            teacherReportReason: null,
            unreadCount: 0,
            participantUnreadCount: 0,
            studentName: "Student One",
            studentEmail: null,
            studentIsAdmin: false,
            teacherName: "Teacher One",
            teacherEmail: null,
            teacherIsAdmin: false,
            counterpartName: "Student One",
            counterpartIsAdmin: false,
            latestMessage: "Hi",
            latestMessageAt: new Date().toISOString(),
          },
        ]);
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

    const fab = await screen.findByRole("button", { name: /open chat/i });
    await act(async () => {
      fireEvent.click(fab);
    });

    expect(
      await screen.findByRole("checkbox", { name: /Enable two-way student chat/i }),
    ).toBeInTheDocument();
  });
});

describe("ChatPanel read-only conversations", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionState.user = { id: "teacher-1", role: "TEACHER" };
    fetchMock.mockReset();
    subscribeRealtimeMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    const proto = Element.prototype as unknown as { scrollIntoView?: () => void };
    if (typeof proto.scrollIntoView !== "function") {
      proto.scrollIntoView = function scrollIntoViewStub() {};
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function adminThreadFor(viewerCanSend: boolean) {
    return [
      {
        id: "admin-thread",
        studentId: "admin-1",
        teacherId: "teacher-1",
        twoWayEnabled: viewerCanSend,
        studentBlockedAt: null,
        teacherBlockedAt: null,
        studentReportedAt: null,
        teacherReportedAt: null,
        studentReportReason: null,
        teacherReportReason: null,
        unreadCount: 0,
        participantUnreadCount: 0,
        studentName: null,
        studentEmail: null,
        studentIsAdmin: true,
        teacherName: "Teacher One",
        teacherEmail: null,
        teacherIsAdmin: false,
        counterpartName: null,
        counterpartIsAdmin: true,
        viewerCanSend,
        latestMessage: "This is the Admin",
        latestMessageAt: new Date().toISOString(),
      },
    ];
  }

  async function openPanel(viewerCanSend: boolean) {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/chat/threads") && !url.includes("/messages")) {
        return jsonResponse(adminThreadFor(viewerCanSend));
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
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /open chat/i }));
    });
    await screen.findByText("This is the Admin");
  }

  test("disables the composer and says so when the viewer cannot reply", async () => {
    await openPanel(false);

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByLabelText("You can't reply in this conversation")).toBeDisabled();
    expect(
      screen.getByText(/Read-only — you can read this conversation/),
    ).toBeInTheDocument();
  });

  test("leaves the composer usable when the viewer can reply", async () => {
    await openPanel(true);

    expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
    expect(screen.getByLabelText("Type a message...")).not.toBeDisabled();
    expect(
      screen.queryByText(/Read-only — you can read this conversation/),
    ).not.toBeInTheDocument();
  });
});
