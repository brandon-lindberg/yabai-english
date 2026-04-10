"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
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
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    void refresh();
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
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t("notifications")}</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs text-link hover:opacity-90"
            >
              {t("markAllRead")}
            </button>
          </div>
          <ul className="max-h-96 space-y-2 overflow-auto">
            {items.length === 0 ? (
              <li className="text-sm text-muted">{t("noNotifications")}</li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-foreground">{item.titleEn}</p>
                  {item.bodyEn && <p className="mt-0.5 text-muted">{item.bodyEn}</p>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
