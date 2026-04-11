"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { getReceiptKey } from "@/lib/chat-receipts";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { REALTIME_EVENTS } from "@/lib/realtime-events";

type ThreadItem = {
  id: string;
  studentId: string;
  teacherId: string;
  twoWayEnabled: boolean;
  unreadCount: number;
  counterpartName: string | null;
  latestMessage: string | null;
  latestMessageAt: string | null;
};

type MessageItem = {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function ChatPanel() {
  const t = useTranslations("chat");
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"threads" | "chat">("threads");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  async function loadThreads() {
    const res = await fetch("/api/chat/threads");
    if (!res.ok) return;
    const data = (await res.json()) as ThreadItem[];
    setThreads(data);
    if (!activeThreadId && data[0]) {
      setActiveThreadId(data[0].id);
      setMobilePane("chat");
    }
  }

  async function loadMessages(threadId: string) {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as MessageItem[];
    setMessages(data);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadThreads();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount bootstrap only

  useEffect(() => {
    if (!activeThreadId) return;
    queueMicrotask(() => {
      void loadMessages(activeThreadId);
    });
  }, [activeThreadId]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const socket = getRealtimeSocket(userId);
    const onChatUpdate = (payload?: { threadId?: string }) => {
      void loadThreads();
      if (activeThreadId && (!payload?.threadId || payload.threadId === activeThreadId)) {
        void loadMessages(activeThreadId);
      }
    };
    socket.on(REALTIME_EVENTS.CHAT_UPDATE, onChatUpdate);
    return () => {
      socket.off(REALTIME_EVENTS.CHAT_UPDATE, onChatUpdate);
    };
  }, [session?.user?.id, activeThreadId]); // eslint-disable-line react-hooks/exhaustive-deps -- avoid resubscribe churn

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function dayLabel(iso: string) {
    const dt = new Date(iso);
    const today = new Date();
    const sameDay =
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth() &&
      dt.getDate() === today.getDate();
    if (sameDay) return t("today");
    return dt.toLocaleDateString();
  }

  function timeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function send() {
    if (!activeThreadId || !draft.trim()) return;
    setStatus(null);
    const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus(data.error ?? t("sendFailed"));
      return;
    }
    setDraft("");
    await loadMessages(activeThreadId);
    await loadThreads();
  }

  async function setTwoWayEnabled(enabled: boolean) {
    if (!activeThreadId) return;
    const res = await fetch(`/api/chat/threads/${activeThreadId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twoWayEnabled: enabled }),
    });
    if (res.ok) {
      await loadThreads();
    }
  }

  const isTeacherOrAdmin =
    session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN";
  const canSend =
    (session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN") ||
    Boolean(activeThread?.twoWayEnabled);

  if (!session?.user?.id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground shadow-lg hover:opacity-90 ${
          open ? "hidden" : ""
        }`}
        aria-label={open ? t("close") : t("open")}
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-[78vh] rounded-t-2xl border border-border bg-surface shadow-xl md:bottom-5 md:left-auto md:right-5 md:top-20 md:h-auto md:w-[760px] md:rounded-2xl">
          <div className="mb-2 flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:bg-[var(--app-hover)]"
            >
              {t("close")}
            </button>
          </div>
          <div className="grid h-[calc(100%-56px)] grid-cols-1 gap-3 p-3 md:grid-cols-[260px_1fr]">
            <aside
              className={`min-h-0 rounded-xl border border-border bg-background p-2 ${
                mobilePane === "chat" ? "hidden md:block" : "block"
              }`}
            >
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t("conversations")}
              </p>
              <div className="max-h-full space-y-2 overflow-auto pr-1">
                {threads.length === 0 ? (
                  <p className="px-2 text-sm text-muted">{t("noThreads")}</p>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setActiveThreadId(thread.id);
                        setMobilePane("chat");
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                        thread.id === activeThreadId
                          ? "border-accent bg-[var(--app-hover)]"
                          : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {thread.counterpartName ?? t("unknownUser")}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-muted">
                        {thread.latestMessage ?? t("noMessagesYet")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div
              className={`flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background p-3 ${
                mobilePane === "chat" ? "flex" : "hidden md:flex"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeThread?.counterpartName ?? t("unknownUser")}
                  </p>
                  <p className="text-xs text-muted">{t("conversations")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePane("threads")}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:bg-[var(--app-hover)] md:hidden"
                >
                  {t("backToThreads")}
                </button>
              </div>

              {isTeacherOrAdmin && activeThread && (
                <label className="mb-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={activeThread.twoWayEnabled}
                    onChange={(e) => void setTwoWayEnabled(e.target.checked)}
                  />
                  {t("enableTwoWay")}
                </label>
              )}
              <div className="flex-1 space-y-2 overflow-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted">{t("noMessagesYet")}</p>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = msg.senderId === session?.user?.id;
                    const prev = messages[index - 1];
                    const showDayBreak =
                      !prev ||
                      new Date(prev.createdAt).toDateString() !==
                        new Date(msg.createdAt).toDateString();
                    return (
                      <div key={msg.id}>
                        {showDayBreak && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-medium text-muted">
                              {dayLabel(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[75%]">
                            <div
                              className={`relative rounded-2xl px-3 py-2 text-sm ${
                                isMine
                                  ? "rounded-br-md bg-primary text-primary-foreground"
                                  : "rounded-bl-md border border-border bg-surface text-foreground"
                              }`}
                            >
                              <p>{msg.body}</p>
                              <span
                                className={`pointer-events-none absolute bottom-0 h-2 w-2 ${
                                  isMine
                                    ? "right-[-3px] rotate-45 bg-primary"
                                    : "left-[-5px] rotate-45 border-b border-l border-border bg-surface"
                                }`}
                              />
                            </div>
                            <p
                              className={`mt-1 text-[10px] text-muted ${isMine ? "text-right" : ""}`}
                            >
                              {isMine
                                ? `${timeLabel(msg.createdAt)} · ${t(
                                    getReceiptKey(msg.readAt),
                                  )}`
                                : timeLabel(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!canSend}
                  className="flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder={t("messagePlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!canSend}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {t("send")}
                </button>
              </div>
              {!canSend && (
                <p className="mt-2 text-xs text-muted">{t("readOnlyHint")}</p>
              )}
              {status && <p className="mt-2 text-xs text-muted">{status}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
