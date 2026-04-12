"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { REALTIME_EVENTS } from "@/lib/realtime-events";

type NotificationItem = {
  id: string;
  titleJa: string;
  titleEn: string;
  bodyJa: string | null;
  bodyEn: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  async function refresh() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = (await res.json()) as {
      items: NotificationItem[];
      unreadCount: number;
    };
    setItems(data.items);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const socket = getRealtimeSocket(userId);
    const onUpdate = () => {
      void refresh();
    };
    const onConnect = () => {
      void refresh();
    };
    socket.on(REALTIME_EVENTS.NOTIFICATIONS_UPDATE, onUpdate);
    socket.on("connect", onConnect);
    return () => {
      socket.off(REALTIME_EVENTS.NOTIFICATIONS_UPDATE, onUpdate);
      socket.off("connect", onConnect);
    };
  }, [session?.user?.id]);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    await refresh();
  }

  async function dismissOne(id: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) await refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function clearAll() {
    setClearingAll(true);
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) await refresh();
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("notifications")}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground hover:bg-[var(--app-hover)]"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("notifications")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-link hover:opacity-90"
              >
                {t("markAllRead")}
              </button>
              <button
                type="button"
                disabled={clearingAll || items.length === 0}
                onClick={() => void clearAll()}
                className="text-xs font-medium text-link hover:opacity-90 disabled:opacity-40"
              >
                {t("clearAllNotifications")}
              </button>
            </div>
          </div>
          <ul className="max-h-96 space-y-2 overflow-auto">
            {items.length === 0 ? (
              <li className="text-sm text-muted">{t("noNotifications")}</li>
            ) : (
              items.map((item) => {
                const title = locale.startsWith("ja") ? item.titleJa : item.titleEn;
                const body = locale.startsWith("ja") ? item.bodyJa : item.bodyEn;
                return (
                  <li
                    key={item.id}
                    className="flex gap-2 rounded-xl border border-border bg-background px-2 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1 px-1">
                      <p className="font-semibold text-foreground">{title}</p>
                      {body ? <p className="mt-0.5 text-muted">{body}</p> : null}
                    </div>
                    <button
                      type="button"
                      aria-label={t("clearNotification")}
                      title={t("clearNotification")}
                      disabled={pendingId === item.id}
                      onClick={() => void dismissOne(item.id)}
                      className="shrink-0 self-start rounded-lg px-2 py-1 text-muted hover:bg-[var(--app-hover)] hover:text-foreground disabled:opacity-40"
                    >
                      ×
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
