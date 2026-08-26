"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeRealtime } from "@/lib/realtime-client";
import { Skeleton } from "@/components/ui/skeleton";
import { actionLinkClass } from "@/components/ui/inline-link";
import { Link } from "@/i18n/navigation";

type NotificationItem = {
  id: string;
  titleJa: string;
  titleEn: string;
  bodyJa: string | null;
  bodyEn: string | null;
  href: string | null;
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  async function refresh() {
    let res: Response;
    try {
      res = await fetch("/api/notifications");
    } catch {
      setHasLoadedOnce(true);
      return;
    }
    setHasLoadedOnce(true);
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
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    return subscribeRealtime({
      // Fresh snapshot on initial connect and on reconnect.
      onConnected: () => {
        void refresh();
      },
      onNotificationsUpdate: () => {
        void refresh();
      },
      onChatUpdate: () => {
        // Chat updates are handled by the chat panel.
      },
    });
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
    /* No positioning context below `sm`: the panel then resolves against the
       sticky <header>, which spans the viewport, so it can sit between the
       screen edges instead of hanging off the left of a bell that is not
       itself at the edge. From `sm` up it anchors to the bell as usual. */
    <div ref={rootRef} className="sm:relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? t("notificationsWithCount", { count: unreadCount }) : t("notifications")
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        /* `min-h-11` clears the 44px comfortable touch target the emoji-sized
           button did not. The count is `aria-hidden` because the button's own
           label already states it — otherwise it is read twice. */
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border text-base text-foreground transition-colors hover:bg-[var(--app-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[1.125rem] tabular-nums text-primary-foreground"
          >
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          data-testid="notification-panel"
          className="absolute inset-x-3 top-full z-[60] mt-2 rounded-2xl border border-border bg-surface p-3 sm:inset-x-auto sm:left-auto sm:right-0 sm:w-80"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("notifications")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void markAllRead()}
                className={`${actionLinkClass} text-xs`}
              >
                {t("markAllRead")}
              </button>
              <button
                type="button"
                disabled={clearingAll || items.length === 0}
                onClick={() => void clearAll()}
                className={`${actionLinkClass} text-xs disabled:opacity-40`}
              >
                {t("clearAllNotifications")}
              </button>
            </div>
          </div>
          <ul
            /* Cap against the viewport too, so a long list on a short phone
               scrolls inside the panel instead of running off the bottom. */
            className="max-h-[min(24rem,calc(100dvh-11rem))] space-y-2 overflow-auto"
            aria-busy={!hasLoadedOnce || undefined}
          >
            {!hasLoadedOnce && items.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={`skeleton-${i}`}
                  data-testid="notification-skeleton"
                  className="flex gap-2 rounded-xl border border-border bg-background px-2 py-2"
                >
                  <div className="min-w-0 flex-1 space-y-2 px-1">
                    <Skeleton height="3" width="2/3" />
                    <Skeleton height="3" width="3/4" />
                  </div>
                </li>
              ))
            ) : items.length === 0 ? (
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
                      {item.href ? (
                        // Clicking through is the whole point of a notification
                        // that is about somewhere; reading it also clears it.
                        <Link
                          href={item.href as "/admin/payments"}
                          onClick={() => {
                            setOpen(false);
                            void markAllRead();
                          }}
                          className="font-semibold text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                        >
                          {title}
                        </Link>
                      ) : (
                        <p className="font-semibold text-foreground">{title}</p>
                      )}
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
