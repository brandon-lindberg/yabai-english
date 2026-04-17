"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { getReceiptKey } from "@/lib/chat-receipts";
import { subscribeRealtime } from "@/lib/realtime-client";
import { ChatModerationMenu } from "@/components/chat-moderation-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UnreadBadge } from "@/components/unread-badge";

type ThreadItem = {
  id: string;
  studentId: string;
  teacherId: string;
  twoWayEnabled: boolean;
  studentBlockedAt: string | null;
  teacherBlockedAt: string | null;
  studentReportedAt: string | null;
  teacherReportedAt: string | null;
  studentReportReason: string | null;
  teacherReportReason: string | null;
  unreadCount: number;
  studentName: string;
  studentEmail: string | null;
  teacherName: string;
  teacherEmail: string | null;
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

type BroadcastHistoryItem = {
  id: string;
  target: "ALL" | "TEACHERS" | "STUDENTS";
  body: string;
  targetedRecipients: number;
  sentMessages: number;
  createdAt: string;
};

export function ChatPanel() {
  const t = useTranslations("chat");
  const { data: session } = useSession();
  const isAdminViewer = session?.user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [adminQueue, setAdminQueue] = useState<"all" | "reported" | "blocked" | "unread">("reported");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminMode, setAdminMode] = useState<"review" | "direct" | "broadcast">("review");
  const [adminContactType, setAdminContactType] = useState<"teacher" | "student">("teacher");
  const [adminSelectedContactId, setAdminSelectedContactId] = useState<string>("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "teachers" | "students">(
    "all",
  );
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistoryItem[]>([]);
  const [mobilePane, setMobilePane] = useState<"threads" | "chat">("threads");
  const [moderationBusy, setModerationBusy] = useState(false);
  const [threadSwipeOpenId, setThreadSwipeOpenId] = useState<string>("");
  const [threadSwipeDragOffset, setThreadSwipeDragOffset] = useState<number>(0);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const threadSwipeRef = useRef<{
    threadId: string;
    startX: number;
    startOffset: number;
    moved: boolean;
    currentOffset: number;
  } | null>(null);
  const suppressThreadClickRef = useRef<string | null>(null);

  const [onboardingContext, setOnboardingContext] = useState<{
    step: string;
    returnHref: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openChat") === "1") {
      setOpen(true);
      const step = params.get("onboardingStep");
      const returnHref = params.get("onboardingNext");
      if (step && returnHref) {
        setOnboardingContext({ step, returnHref });
      }
      params.delete("openChat");
      const qs = params.toString();
      const newUrl =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  const closeAndMaybeCompleteOnboarding = useCallback(async () => {
    setOpen(false);
    if (!onboardingContext) return;
    const { step, returnHref } = onboardingContext;
    setOnboardingContext(null);
    try {
      await fetch("/api/onboarding/skip-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step }),
      });
    } catch {
      // non-fatal - proceed to redirect regardless
    }
    if (typeof window !== "undefined") {
      window.location.href = returnHref;
    }
  }, [onboardingContext]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );
  const totalUnreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [threads],
  );

  const loadThreads = useCallback(async () => {
    const params = new URLSearchParams();
    if (session?.user?.role === "ADMIN") {
      params.set("queue", adminQueue);
      if (adminSearch.trim()) params.set("q", adminSearch.trim());
    }
    const query = params.toString();
    let res: Response;
    try {
      res = await fetch(`/api/chat/threads${query ? `?${query}` : ""}`);
    } catch {
      setThreadsLoading(false);
      return;
    }
    setThreadsLoading(false);
    if (!res.ok) return;
    const data = (await res.json()) as ThreadItem[];
    setThreads(data);
    if (data.length === 0) {
      setActiveThreadId("");
      setMessages([]);
      if (session?.user?.role === "ADMIN") {
        setMobilePane("threads");
      }
      return;
    }
    let pickedFirst = false;
    setActiveThreadId((prev) => {
      if (!prev && data[0]?.id) {
        pickedFirst = true;
        return data[0].id;
      }
      return prev;
    });
    if (pickedFirst) {
      setMobilePane("chat");
    }
    setActiveThreadId((prev) => {
      if (prev && data.some((t) => t.id === prev)) return prev;
      return data[0]?.id ?? "";
    });
  }, [session?.user?.role, adminQueue, adminSearch]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      setMessagesLoading(true);
      let res: Response;
      try {
        res = await fetch(`/api/chat/threads/${threadId}/messages`);
      } catch {
        setMessagesLoading(false);
        return;
      }
      setMessagesLoading(false);
      if (!res.ok) return;
      const data = (await res.json()) as MessageItem[];
      setMessages(data);
      await loadThreads();
    },
    [loadThreads],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void loadThreads();
    });
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThreadId) return;
    // Only load (and thereby mark-as-read) when the panel is actually open.
    // Otherwise just mounting the dashboard would silently clear every unread
    // badge before the user ever sees it.
    if (!open) return;
    queueMicrotask(() => {
      void loadMessages(activeThreadId);
    });
  }, [activeThreadId, loadMessages, open]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    if (!threads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId("");
      setMessages([]);
    }
  }, [threads, activeThreadId]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const unsubscribe = subscribeRealtime({
      // Pull a fresh snapshot on every (re)connect so we never show stale
      // unread counts after a dropped SSE connection.
      onConnected: () => {
        void loadThreads();
      },
      onChatUpdate: (payload) => {
        void loadThreads();
        // Never silently mark messages read when the user isn't actually
        // looking at the panel - that's what was wiping the unread badge on
        // dashboard mount before.
        if (
          open &&
          activeThreadId &&
          (!payload?.threadId || payload.threadId === activeThreadId)
        ) {
          void loadMessages(activeThreadId);
        }
      },
      onNotificationsUpdate: () => {
        // Nothing to do here for the chat panel; the bell handles its own UI.
      },
    });
    return unsubscribe;
  }, [session?.user?.id, activeThreadId, loadThreads, loadMessages, open]);

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

  async function sendBroadcast() {
    if (!isAdminViewer || !draft.trim() || broadcastBusy) return;
    setBroadcastBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/chat/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: draft,
          target: broadcastTarget,
        }),
      });
      const data = (await res.json()) as { error?: string; targetedRecipients?: number };
      if (!res.ok) {
        setStatus(data.error ?? t("sendFailed"));
        return;
      }
      setDraft("");
      setStatus(
        t("broadcastSent", {
          count: data.targetedRecipients ?? 0,
        }),
      );
      await loadThreads();
      const list = await fetch("/api/admin/chat/broadcast");
      if (list.ok) {
        const payload = (await list.json()) as { items: BroadcastHistoryItem[] };
        setBroadcastHistory(payload.items ?? []);
      }
    } finally {
      setBroadcastBusy(false);
    }
  }

  useEffect(() => {
    if (!isAdminViewer || adminMode !== "broadcast") return;
    void (async () => {
      const res = await fetch("/api/admin/chat/broadcast");
      if (!res.ok) return;
      const payload = (await res.json()) as { items: BroadcastHistoryItem[] };
      setBroadcastHistory(payload.items ?? []);
    })();
  }, [isAdminViewer, adminMode]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => {
      setStatus(null);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function sendDirectMessage() {
    if (!isAdminViewer || adminMode !== "direct" || !directTargetThreadId || !draft.trim()) return;
    setStatus(null);
    const res = await fetch(`/api/chat/threads/${directTargetThreadId}/messages`, {
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
    setStatus(
      t("directSent", {
        name: selectedDirectContact?.name ?? t("unknownUser"),
      }),
    );
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

  async function moderateThread(action: "block" | "unblock" | "report") {
    if (!activeThreadId || !activeThread || moderationBusy) return;
    let reason: string | undefined;
    if (action === "report") {
      const value = window.prompt(t("reportPrompt"), "");
      if (value === null) return;
      reason = value.trim();
      if (!reason) {
        setStatus(t("reportReasonRequired"));
        return;
      }
    }
    setModerationBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/chat/threads/${activeThreadId}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus(data.error ?? t("moderationFailed"));
        return;
      }
      await loadThreads();
      if (action === "report") {
        setStatus(t("reportSubmitted"));
      }
    } finally {
      setModerationBusy(false);
    }
  }

  async function archiveConversation(threadId: string) {
    const confirmed = window.confirm(t("archiveConfirm"));
    if (!confirmed) return;
    setStatus(null);
    const res = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setStatus(data?.error ?? t("archiveFailed"));
      return;
    }
    if (activeThreadId === threadId) {
      setActiveThreadId("");
      setMessages([]);
      setMobilePane("threads");
    }
    setThreadSwipeOpenId("");
    setThreadSwipeDragOffset(0);
    setStatus(t("archiveSuccess"));
    await loadThreads();
  }

  function onThreadSwipeStart(
    threadId: string,
    clientX: number,
    currentTarget: HTMLElement,
    pointerId: number,
  ) {
    currentTarget.setPointerCapture(pointerId);
    const openOffset = threadSwipeOpenId === threadId ? -88 : 0;
    threadSwipeRef.current = {
      threadId,
      startX: clientX,
      startOffset: openOffset,
      moved: false,
      currentOffset: openOffset,
    };
  }

  function onThreadSwipeMove(clientX: number) {
    const state = threadSwipeRef.current;
    if (!state) return;
    const delta = clientX - state.startX;
    const maxSwipe = 88;
    const nextOffset = Math.max(-maxSwipe, Math.min(0, state.startOffset + delta));
    if (Math.abs(delta) > 6) {
      state.moved = true;
    }
    state.currentOffset = nextOffset;
    if (threadSwipeOpenId !== state.threadId) {
      setThreadSwipeOpenId(state.threadId);
    }
    setThreadSwipeDragOffset(nextOffset);
  }

  function onThreadSwipeEnd() {
    const state = threadSwipeRef.current;
    if (!state) return;
    const currentOffset = state.currentOffset;
    const maxSwipe = 88;
    const shouldOpenAction = currentOffset <= -36;
    setThreadSwipeOpenId(shouldOpenAction ? state.threadId : "");
    setThreadSwipeDragOffset(shouldOpenAction ? -maxSwipe : 0);
    if (state.moved) {
      suppressThreadClickRef.current = state.threadId;
    }
    threadSwipeRef.current = null;
  }

  function closeThreadSwipe(threadId: string) {
    if (threadSwipeOpenId !== threadId) return;
    setThreadSwipeOpenId("");
    setThreadSwipeDragOffset(0);
  }

  useEffect(() => {
    function onGlobalPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-chat-thread-row='true']")) return;
      setThreadSwipeOpenId("");
      setThreadSwipeDragOffset(0);
    }
    document.addEventListener("pointerdown", onGlobalPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onGlobalPointerDown);
    };
  }, []);

  const canSend =
    session?.user?.role === "TEACHER" ||
    (session?.user?.role === "ADMIN" && (adminMode === "broadcast" || adminMode === "direct")) ||
    Boolean(activeThread?.twoWayEnabled);
  const isBlocked = Boolean(
    activeThread?.studentBlockedAt || activeThread?.teacherBlockedAt,
  );
  const myUserId = session?.user?.id;
  const isStudentInThread = Boolean(activeThread && myUserId === activeThread.studentId);
  const isTeacherInThread = Boolean(activeThread && myUserId === activeThread.teacherId);
  const myBlockedAt = isStudentInThread
    ? activeThread?.studentBlockedAt
    : isTeacherInThread
      ? activeThread?.teacherBlockedAt
      : null;

  const adminContacts = useMemo(() => {
    if (!isAdminViewer || adminQueue !== "all") return [];
    const map = new Map<string, { id: string; name: string; email: string; count: number }>();
    for (const thread of threads) {
      const id = adminContactType === "teacher" ? thread.teacherId : thread.studentId;
      const name = adminContactType === "teacher" ? thread.teacherName : thread.studentName;
      const email =
        (adminContactType === "teacher" ? thread.teacherEmail : thread.studentEmail) ?? "";
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(id, { id, name, email, count: 1 });
      }
    }
    const q = adminSearch.trim().toLowerCase();
    const contacts = Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return q
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
        )
      : contacts;
  }, [isAdminViewer, adminQueue, threads, adminContactType, adminSearch]);

  const adminContactThreads = useMemo(() => {
    if (!isAdminViewer || adminQueue !== "all" || !adminSelectedContactId) return [];
    return threads.filter((thread) =>
      adminContactType === "teacher"
        ? thread.teacherId === adminSelectedContactId
        : thread.studentId === adminSelectedContactId,
    );
  }, [isAdminViewer, adminQueue, threads, adminSelectedContactId, adminContactType]);

  const selectedDirectContact = useMemo(() => {
    if (!isAdminViewer || adminMode !== "direct") return null;
    return adminContacts.find((c) => c.id === adminSelectedContactId) ?? null;
  }, [isAdminViewer, adminMode, adminContacts, adminSelectedContactId]);

  const directTargetThreadId = adminContactThreads[0]?.id ?? "";

  useEffect(() => {
    if (!isAdminViewer || adminQueue !== "all") return;
    setAdminSelectedContactId((prev) => {
      if (prev && adminContacts.some((c) => c.id === prev)) return prev;
      return adminContacts[0]?.id ?? "";
    });
  }, [isAdminViewer, adminQueue, adminContacts]);

  useEffect(() => {
    if (!isAdminViewer || adminQueue !== "all" || adminMode === "direct") return;
    if (!adminSelectedContactId) {
      setActiveThreadId("");
      setMessages([]);
      return;
    }

    const firstThreadId = adminContactThreads[0]?.id ?? "";
    const hasActiveInContact = adminContactThreads.some((t) => t.id === activeThreadId);
    if (!hasActiveInContact) {
      setActiveThreadId(firstThreadId);
      setMessages([]);
      if (firstThreadId) {
        setMobilePane("chat");
      }
    }
  }, [
    isAdminViewer,
    adminQueue,
    adminMode,
    adminSelectedContactId,
    adminContactThreads,
    activeThreadId,
  ]);

  if (!session?.user?.id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-40 flex h-11 max-w-[10rem] items-center justify-center gap-1.5 rounded-full border border-border bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md ring-1 ring-black/5 hover:opacity-90 ${
          open ? "hidden" : ""
        }`}
        aria-label={open ? t("close") : t("open")}
      >
        <span className="truncate">{t("title")}</span>
        <UnreadBadge
          count={totalUnreadCount}
          label={(n) => t("unreadBadgeLabel", { count: n })}
          className="absolute -right-1.5 -top-1.5"
        />
      </button>

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] h-[78vh] rounded-t-2xl border border-border bg-surface shadow-xl md:bottom-5 md:left-auto md:right-5 md:top-20 md:h-auto md:w-[760px] md:rounded-2xl">
          <div className="mb-2 flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <div className="flex items-center gap-2">
              {activeThread && (
                <ChatModerationMenu
                  menuAriaLabel={t("moreActions")}
                  blockLabel={t("blockUser")}
                  unblockLabel={t("unblockUser")}
                  reportLabel={t("reportUser")}
                  blockDisabled={moderationBusy || Boolean(myBlockedAt)}
                  unblockDisabled={moderationBusy || !myBlockedAt}
                  reportDisabled={moderationBusy}
                  onBlock={() => void moderateThread("block")}
                  onUnblock={() => void moderateThread("unblock")}
                  onReport={() => void moderateThread("report")}
                />
              )}
              <button
                type="button"
                onClick={() => void closeAndMaybeCompleteOnboarding()}
                className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:bg-[var(--app-hover)]"
              >
                {t("close")}
              </button>
            </div>
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
              {isAdminViewer && (
                <div className="mb-2 space-y-2 px-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAdminMode("review")}
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        adminMode === "review"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted"
                      }`}
                    >
                      {t("adminModeReview")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMode("direct");
                        setAdminQueue("all");
                      }}
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        adminMode === "direct"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted"
                      }`}
                    >
                      {t("adminModeDirect")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminMode("broadcast")}
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        adminMode === "broadcast"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted"
                      }`}
                    >
                      {t("adminModeBroadcast")}
                    </button>
                  </div>
                  {adminMode !== "broadcast" && (
                    <>
                      <div className="flex flex-wrap gap-1">
                        {(["reported", "unread", "blocked", "all"] as const).map((queue) => (
                          <button
                            key={queue}
                            type="button"
                            onClick={() => setAdminQueue(queue)}
                            disabled={adminMode !== "review"}
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                              adminQueue === queue
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted"
                            } ${adminMode !== "review" ? "opacity-40" : ""}`}
                          >
                            {t(`adminQueue${queue[0]!.toUpperCase()}${queue.slice(1)}`)}
                          </button>
                        ))}
                      </div>
                      <input
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground"
                        placeholder={t("adminSearchPlaceholder")}
                      />
                      {(adminQueue === "all" || adminMode === "direct") && (
                        <div className="flex gap-1">
                          {(["teacher", "student"] as const).map((kind) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => {
                                setAdminContactType(kind);
                                setAdminSelectedContactId("");
                              }}
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                adminContactType === kind
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border text-muted"
                              }`}
                            >
                              {kind === "teacher"
                                ? t("adminContactTypeTeacher")
                                : t("adminContactTypeStudent")}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="max-h-full space-y-2 overflow-auto pr-1">
                {isAdminViewer && adminMode === "broadcast" ? (
                  <div className="space-y-2 px-1">
                    <p className="text-sm text-muted">{t("broadcastLeftPanelHint")}</p>
                    <div className="rounded-xl border border-border bg-surface p-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {t("broadcastHistoryTitle")}
                      </p>
                      {broadcastHistory.length === 0 ? (
                        <p className="text-xs text-muted">{t("broadcastHistoryEmpty")}</p>
                      ) : (
                        <div className="max-h-[46vh] space-y-2 overflow-auto">
                          {broadcastHistory.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDraft(item.body)}
                              className="w-full rounded-lg border border-border px-2 py-1 text-left text-xs hover:bg-[var(--app-hover)]"
                            >
                              <p className="font-semibold text-foreground">
                                {item.target === "ALL"
                                  ? t("broadcastTargetAll")
                                  : item.target === "TEACHERS"
                                    ? t("broadcastTargetTeachers")
                                    : t("broadcastTargetStudents")}
                              </p>
                              <p className="line-clamp-2 text-muted">{item.body}</p>
                              <p className="text-[10px] text-muted">
                                {new Date(item.createdAt).toLocaleString()} ·{" "}
                                {t("broadcastHistoryRecipients", {
                                  count: item.targetedRecipients,
                                })}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : threadsLoading && threads.length === 0 ? (
                  <div
                    data-testid="chat-threads-loading"
                    aria-busy="true"
                    className="space-y-2 px-1"
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Skeleton height="4" width="1/2" />
                          <Skeleton
                            width="1/4"
                            rounded="full"
                            className="!h-4 !w-8 shrink-0"
                          />
                        </div>
                        <div className="mt-2">
                          <Skeleton height="3" width="3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : threads.length === 0 ? (
                  <p className="px-2 text-sm text-muted">
                    {isAdminViewer && adminQueue === "blocked"
                      ? t("adminNoBlockedThreads")
                      : isAdminViewer && adminQueue === "reported"
                        ? t("adminNoReportedThreads")
                        : isAdminViewer && adminQueue === "unread"
                          ? t("adminNoUnreadThreads")
                          : t("noThreads")}
                  </p>
                ) : (
                  (isAdminViewer
                    ? adminMode === "direct"
                      ? (
                          <div className="space-y-1">
                            <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                              {t("adminContactListTitle")}
                            </p>
                            {adminContacts.length === 0 ? (
                              <p className="px-2 text-xs text-muted">{t("adminNoContacts")}</p>
                            ) : (
                              adminContacts.map((contact) => (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => {
                                    setAdminSelectedContactId(contact.id);
                                    setStatus(null);
                                  }}
                                  className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs ${
                                    adminSelectedContactId === contact.id
                                      ? "border-accent bg-[var(--app-hover)]"
                                      : "border-border bg-surface"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-foreground">{contact.name}</p>
                                      {contact.email ? (
                                        <p className="text-[10px] text-muted">{contact.email}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )
                      : adminQueue === "all"
                      ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                {t("adminContactListTitle")}
                              </p>
                              {adminContacts.length === 0 ? (
                                <p className="px-2 text-xs text-muted">{t("adminNoContacts")}</p>
                              ) : (
                                adminContacts.map((contact) => (
                                  <button
                                    key={contact.id}
                                    type="button"
                                    onClick={() => setAdminSelectedContactId(contact.id)}
                                    className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs ${
                                      adminSelectedContactId === contact.id
                                        ? "border-accent bg-[var(--app-hover)]"
                                        : "border-border bg-surface"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-foreground">{contact.name}</p>
                                        {contact.email ? (
                                          <p className="text-[10px] text-muted">{contact.email}</p>
                                        ) : null}
                                      </div>
                                      <span className="text-[10px] text-muted">
                                        {contact.count}
                                      </span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                {t("adminContactConversationsTitle")}
                              </p>
                              {adminContactThreads.length === 0 ? (
                                <p className="px-2 text-xs text-muted">
                                  {t("adminNoConversationsForContact")}
                                </p>
                              ) : (
                                adminContactThreads.map((thread) => (
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
                                        {thread.studentName} · {thread.teacherName}
                                      </p>
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-muted">
                                      {thread.latestMessage ?? t("noMessagesYet")}
                                    </p>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      : threads.map((thread) => (
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
                                {thread.studentName} · {thread.teacherName}
                              </p>
                              <div className="flex items-center gap-1">
                                {(thread.studentReportedAt || thread.teacherReportedAt) && (
                                  <span className="rounded-full border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--app-warning-text)]">
                                    {t("adminBadgeReported")}
                                  </span>
                                )}
                                {(thread.studentBlockedAt || thread.teacherBlockedAt) && (
                                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                    {t("adminBadgeBlocked")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-muted">
                              {thread.latestMessage ?? t("noMessagesYet")}
                            </p>
                          </button>
                        ))
                    : threads.map((thread) => {
                        const isOpen = threadSwipeOpenId === thread.id;
                        const swipeOffset = isOpen ? threadSwipeDragOffset : 0;
                        const isSwipeOpen = swipeOffset <= -36;
                        return (
                          <div
                            key={thread.id}
                            className="relative overflow-hidden rounded-xl touch-pan-y select-none"
                            data-chat-thread-row="true"
                          >
                            {isOpen && (
                              <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-1">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void archiveConversation(thread.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      void archiveConversation(thread.id);
                                    }
                                  }}
                                  className="flex h-[calc(100%-6px)] w-[92px] cursor-pointer items-center justify-center rounded-xl bg-red-500 px-2 text-center text-xs font-semibold text-white"
                                >
                                  {t("archiveConversation")}
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (suppressThreadClickRef.current === thread.id) {
                                  suppressThreadClickRef.current = null;
                                  return;
                                }
                                if (isOpen) {
                                  closeThreadSwipe(thread.id);
                                  return;
                                }
                                setActiveThreadId(thread.id);
                                setMobilePane("chat");
                              }}
                              onPointerDown={(e) =>
                                onThreadSwipeStart(
                                  thread.id,
                                  e.clientX,
                                  e.currentTarget,
                                  e.pointerId,
                                )
                              }
                              onPointerMove={(e) => onThreadSwipeMove(e.clientX)}
                              onPointerUp={() => onThreadSwipeEnd()}
                              onPointerCancel={() => onThreadSwipeEnd()}
                              style={{ transform: `translateX(${swipeOffset}px)` }}
                              className={`relative z-10 w-full rounded-xl border px-3 py-2 text-left text-xs transition-transform ${
                                thread.id === activeThreadId
                                  ? "border-accent bg-[var(--app-hover)]"
                                  : "border-border bg-surface"
                              } ${isSwipeOpen ? "pointer-events-none" : ""}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-foreground">
                                  {thread.counterpartName ?? t("unknownUser")}
                                </p>
                                <UnreadBadge
                                  count={thread.unreadCount}
                                  label={(n) => t("unreadBadgeLabel", { count: n })}
                                />
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-muted">
                                {thread.latestMessage ?? t("noMessagesYet")}
                              </p>
                            </button>
                          </div>
                        );
                      }))
                )}
              </div>
              {status && (
                <p className="mt-2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted">
                  {status}
                </p>
              )}
            </aside>

            <div
              className={`flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background p-3 ${
                mobilePane === "chat" ? "flex" : "hidden md:flex"
              }`}
            >
              {isAdminViewer && adminMode === "broadcast" ? (
                <div className="flex h-full flex-col">
                  <div className="mb-2 border-b border-border pb-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t("adminModeBroadcast")}
                    </p>
                    <p className="text-xs text-muted">{t("broadcastPanelHint")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <label className="text-xs font-medium text-muted">
                      {t("broadcastTargetLabel")}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <select
                        value={broadcastTarget}
                        onChange={(e) =>
                          setBroadcastTarget(e.target.value as "all" | "teachers" | "students")
                        }
                        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground"
                      >
                        <option value="all">{t("broadcastTargetAll")}</option>
                        <option value="teachers">{t("broadcastTargetTeachers")}</option>
                        <option value="students">{t("broadcastTargetStudents")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex-1">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="h-full min-h-[180px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                      placeholder={t("broadcastMessagePlaceholder")}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft("")}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {t("broadcastClear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendBroadcast()}
                      disabled={broadcastBusy || !draft.trim()}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {broadcastBusy ? t("broadcastSending") : t("broadcastSend")}
                    </button>
                  </div>
                </div>
              ) : isAdminViewer && adminMode === "direct" ? (
                <div className="flex h-full flex-col">
                  <div className="mb-2 border-b border-border pb-2">
                    <p className="text-sm font-semibold text-foreground">{t("adminModeDirect")}</p>
                    <p className="text-xs text-muted">{t("directPanelHint")}</p>
                  </div>
                  {selectedDirectContact ? (
                    <>
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <p className="text-xs font-medium text-muted">{t("directRecipientLabel")}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedDirectContact.name}
                        </p>
                        {selectedDirectContact.email ? (
                          <p className="text-xs text-muted">{selectedDirectContact.email}</p>
                        ) : null}
                      </div>
                      <div className="mt-3 flex-1">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="h-full min-h-[180px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          placeholder={t("directMessagePlaceholder")}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDraft("")}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                        >
                          {t("broadcastClear")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void sendDirectMessage()}
                          disabled={!draft.trim() || !directTargetThreadId}
                          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {t("directSend")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted">{t("directSelectContactFirst")}</p>
                  )}
                </div>
              ) : (
                <>
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  {isAdminViewer && activeThread ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">
                        {t("messageFromStudent")}: {activeThread.studentName}
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {t("messageFromTeacher")}: {activeThread.teacherName}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">
                      {activeThread?.counterpartName ?? t("unknownUser")}
                    </p>
                  )}
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

              {activeThread &&
                (isAdminViewer
                  ? adminMode !== "broadcast"
                  : isTeacherInThread) && (
                <label className="mb-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={activeThread.twoWayEnabled}
                    onChange={(e) => void setTwoWayEnabled(e.target.checked)}
                  />
                  {t("enableTwoWay")}
                </label>
              )}
              {isBlocked && (
                <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {t("blockedHint")}
                </p>
              )}
              <div className="flex-1 space-y-2 overflow-auto">
                {messagesLoading && messages.length === 0 ? (
                  <div
                    data-testid="chat-messages-loading"
                    aria-busy="true"
                    className="space-y-3"
                  >
                    <div className="flex justify-start">
                      <Skeleton
                        width="1/2"
                        rounded="2xl"
                        className="!h-12"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Skeleton
                        width="1/3"
                        rounded="2xl"
                        className="!h-10"
                      />
                    </div>
                    <div className="flex justify-start">
                      <Skeleton
                        width="2/3"
                        rounded="2xl"
                        className="!h-14"
                      />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted">{t("noMessagesYet")}</p>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = msg.senderId === session?.user?.id;
                    const isFromStudent = Boolean(
                      activeThread && msg.senderId === activeThread.studentId,
                    );
                    const isFromTeacher = Boolean(
                      activeThread && msg.senderId === activeThread.teacherId,
                    );
                    /** Admins are not thread participants; align by sender role (teacher right, student left). */
                    const bubbleOnRight = isAdminViewer
                      ? isFromTeacher || msg.senderId === session?.user?.id
                      : isMine;
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
                        <div
                          className={`flex ${bubbleOnRight ? "justify-end" : "justify-start"}`}
                        >
                          <div className="max-w-[75%]">
                            {isAdminViewer && (
                              <p
                                className={`mb-0.5 text-[10px] font-medium text-muted ${
                                  bubbleOnRight ? "text-right" : "text-left"
                                }`}
                              >
                                {isFromStudent
                                  ? t("messageFromStudent")
                                  : isFromTeacher
                                    ? t("messageFromTeacher")
                                    : msg.senderId === session?.user?.id
                                      ? t("messageFromAdmin")
                                      : t("unknownUser")}
                              </p>
                            )}
                            <div
                              className={`relative rounded-2xl px-3 py-2 text-sm ${
                                bubbleOnRight
                                  ? "rounded-br-md bg-primary text-primary-foreground"
                                  : "rounded-bl-md border border-border bg-surface text-foreground"
                              }`}
                            >
                              <p>{msg.body}</p>
                              <span
                                className={`pointer-events-none absolute bottom-0 h-2 w-2 ${
                                  bubbleOnRight
                                    ? "right-[-3px] rotate-45 bg-primary"
                                    : "left-[-5px] rotate-45 border-b border-l border-border bg-surface"
                                }`}
                              />
                            </div>
                            <p
                              className={`mt-1 text-[10px] text-muted ${bubbleOnRight ? "text-right" : ""}`}
                            >
                              {isAdminViewer ? (
                                <>
                                  {timeLabel(msg.createdAt)}
                                  {isFromTeacher && msg.readAt
                                    ? ` · ${t(getReceiptKey(msg.readAt))}`
                                    : null}
                                </>
                              ) : isMine ? (
                                `${timeLabel(msg.createdAt)} · ${t(
                                  getReceiptKey(msg.readAt),
                                )}`
                              ) : (
                                timeLabel(msg.createdAt)
                              )}
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
                  disabled={!canSend || isBlocked || (isAdminViewer && adminMode === "review")}
                  className="flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder={
                    isAdminViewer && adminMode === "review"
                      ? t("adminReviewOnlyPlaceholder")
                      : t("messagePlaceholder")
                  }
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!canSend || isBlocked || (isAdminViewer && adminMode === "review")}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {t("send")}
                </button>
              </div>
              {!canSend && (
                <p className="mt-2 text-xs text-muted">{t("readOnlyHint")}</p>
              )}
              {isAdminViewer && adminMode === "review" && (
                <p className="mt-2 text-xs text-muted">{t("adminReviewOnlyHint")}</p>
              )}
              {isBlocked && (
                <p className="mt-2 text-xs text-muted">{t("blockedComposerHint")}</p>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
