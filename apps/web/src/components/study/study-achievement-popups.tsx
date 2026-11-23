"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { noticeFromStudyAward, type AchievementNotice, type StudyAward } from "@/lib/achievements/study-award-public";
import { subscribeRealtime } from "@/lib/realtime-client";
import { appPathForLocale } from "@/lib/i18n-app-path";

const receiptKey = "studio-seen-study-awards";
const maxReceipts = 64;
const awardKey = ({ scope, id, awardedAt }: AchievementNotice) => `${scope}:${id}:${awardedAt}`;

function claimAwards(seen: Set<string>, batch: readonly AchievementNotice[], userId: string) {
  const storageKey = receiptKey + ":" + userId;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(stored)) {
      for (const key of stored.slice(-maxReceipts)) if (typeof key === "string") seen.add(key);
    }
  } catch { /* A blocked store still allows in-memory deduplication. */ }
  const fresh = batch.filter(award => {
    const key = awardKey(award);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const recent = [...seen].slice(-maxReceipts);
  seen.clear();
  for (const key of recent) seen.add(key);
  if (fresh.length) {
    try { localStorage.setItem(storageKey, JSON.stringify(recent)); } catch { /* In-memory fallback. */ }
  }
  return fresh;
}

type AnnounceStudyAwards = (awards?: readonly StudyAward[]) => void;
const StudyAwardAnnouncement = createContext<AnnounceStudyAwards>(() => {});
export const useStudyAwardAnnouncement = () => useContext(StudyAwardAnnouncement);

export function StudyAchievementPopups({ children, userId, scope }: {
  children: ReactNode; userId: string; scope: AchievementNotice["scope"];
}) {
  const [pending, setPending] = useState<AchievementNotice[][]>([]);
  const seen = useRef(new Set<string>());
  const show = useCallback((batch: readonly AchievementNotice[]) => {
    const inScope = batch.filter(award => award.scope === scope);
    if (!inScope.length) return;
    const fresh = claimAwards(seen.current, inScope, userId);
    if (fresh.length) {
      setPending(previous => previous.length < 3
        ? [...previous, fresh]
        : [previous[0], previous[1], [...previous[2], ...fresh]]);
    }
  }, [scope, userId]);
  const announce = useCallback<AnnounceStudyAwards>(batch => { if (batch) show(batch.map(noticeFromStudyAward)); }, [show]);
  useEffect(() => subscribeRealtime({
    onAchievements: show,
    onChatUpdate: () => {}, onNotificationsUpdate: () => {}, onConnected: () => {},
  }), [show]);
  const dismiss = useCallback(() => setPending(previous => previous.slice(1)), []);
  const t = useTranslations("study");
  const locale = useLocale();
  const current = pending[0];
  const first = current?.[0];
  const title = first ? (current.length === 1 ? first.title[locale === "ja" ? 1 : 0] : t("viewAwardCollection")) : "";
  const label = current ? t("achievementUnlocked", { count: current.length }) : "";

  return <>
    <StudyAwardAnnouncement value={announce}>{children}</StudyAwardAnnouncement>
    <span role="status" aria-live="polite" className="sr-only">{title ? `${label} ${title}` : ""}</span>
    {first && current && title && createPortal(
      <AchievementPopup key={awardKey(first)} award={first} multiple={current.length > 1}
        title={title} label={label} dismiss={dismiss} closeLabel={t("dismissAchievement")} />,
      document.body,
    )}
  </>;
}

function AchievementPopup({ award, multiple, title, label, dismiss, closeLabel }: {
  award: AchievementNotice; multiple: boolean; title: string; label: string; dismiss: () => void; closeLabel: string;
}) {
  const locale = useLocale();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(5_000);
  const query = new URLSearchParams({ view: "collected" });
  if (!multiple) query.set("piece", award.id);

  useEffect(() => {
    if (hovered || focused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let started = 0;
    function pause() {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    }
    function sync() {
      if (document.hidden) pause();
      else if (timer === undefined) {
        started = performance.now();
        timer = setTimeout(dismiss, remaining.current);
      }
    }
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      pause();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [dismiss, hovered, focused]);

  return <div
    data-study-achievement-popup=""
    className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-xs items-center rounded-xl border border-[var(--app-header-border)] bg-surface text-foreground sm:inset-x-auto sm:end-[max(1.25rem,env(safe-area-inset-right))] sm:top-auto sm:bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.5rem)]"
    onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
  >
    <a href={appPathForLocale(locale, "/dashboard/art-gallery", query)} target="_blank" rel="noopener"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-s-xl py-2 ps-2 pe-1 hover:bg-[var(--app-hover)]">
      <Image src={award.hidden ? `/api/achievement-art/${award.id}` : `/achievements/${award.id}.png`} alt="" width={48} height={48} unoptimized
        className="size-12 shrink-0 rounded-md [image-rendering:pixelated]" />
      <span className="min-w-0 break-words">
        <span className="block text-xs font-medium text-muted">{label}</span>
        <span className="block text-sm font-bold leading-snug">{title}</span>
      </span>
    </a>
    <button type="button" aria-label={closeLabel} onClick={dismiss}
      className="me-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-[var(--app-hover)] hover:text-foreground">
      <InterfaceIcon name="close" />
    </button>
  </div>;
}
