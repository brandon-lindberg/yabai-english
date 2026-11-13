"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { japaneseStudyQueueSchema, japaneseStudyResultSchema, japaneseQuickReviewQueueSchema, type JapaneseStudyQueue, type JapaneseQuickReviewQueue, type JapaneseStudyResult } from "@/lib/study/japanese-public";
import { studyRpgProgressFromTotalXp, type StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import type { StudyQueueFocus } from "./study-practice-session";

export type JapaneseStudySessionProps = {
  levelCode?: string; quickReview?: boolean; onReviewSaved?: () => void; initialRpg: StudyRpgSnapshot; queueFocus?: StudyQueueFocus; kind?: "mixed" | "vocabulary" | "kanji";
};
type ErrorState = "queue" | "save" | "refresh" | "unavailable" | "access" | "signedOut" | null;
const requestError = (status: number, fallback: "queue" | "save"): ErrorState => {
  if (status === 401) return "signedOut";
  if (status === 403) return "access";
  if (status === 503) return "unavailable";
  if ([400, 404, 409].includes(status)) return fallback === "save" ? "refresh" : "queue";
  return fallback;
};

/** Japanese automatic practice: opaque issued choices and exact retries, never client grading. */
export function useJapaneseStudySession({ levelCode, initialRpg, queueFocus = "mixed", kind = "mixed", quickReview = false, onReviewSaved }: JapaneseStudySessionProps) {
  const [queue, setQueue] = useState<JapaneseStudyQueue | JapaneseQuickReviewQueue | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [result, setResult] = useState<JapaneseStudyResult | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ xp: 0, correct: 0, wrong: 0 });
  const [rpg, setRpg] = useState(initialRpg);
  const pending = useRef<string | null>(null);
  const resultRef = useRef<JapaneseStudyResult | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const shownAt = useRef(0);
  const current = queue?.cards[index]?.question;

  const loadQueue = useCallback(async (resetScore = false) => {
    const revision = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    inFlight.current = true;
    pending.current = null; resultRef.current = null;
    setLoading(true); setBusy(false); setError(null); setResult(null); setSelected(null); setFinished(false);
    if (resetScore) { setScore({ xp: 0, correct: 0, wrong: 0 }); setUnlocked([]); }
    try {
      const response = await fetch(quickReview ? "/api/japanese-study/quick-review" : "/api/japanese-study/queue", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal,
        body: JSON.stringify(quickReview ? {} : { levelCode, limit: 24, focus: queueFocus, kind }),
      });
      if (revision !== generation.current) return;
      if (!response.ok) { setError(requestError(response.status, "queue")); return; }
      const data = quickReview ? japaneseQuickReviewQueueSchema.parse(await response.json()) : japaneseStudyQueueSchema.parse(await response.json());
      if ("levelCode" in data && (data.levelCode !== levelCode || data.cards.some(card => card.question.level.introduction !== levelCode))) throw new Error("Queue level mismatch");
      if ("dayKey" in data && revision === generation.current) setScore({ xp: data.xp, correct: data.correct, wrong: data.wrong });
      if (revision === generation.current) { setQueue(data); setIndex(0); }
    } catch {
      if (revision === generation.current) setError("queue");
    } finally {
      if (revision === generation.current) { inFlight.current = false; setLoading(false); }
    }
  }, [levelCode, queueFocus, kind, quickReview]);

  const cancel = useCallback(() => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => {
    void loadQueue(true);
    return cancel;
  }, [loadQueue, cancel]);
  useEffect(() => { shownAt.current = Date.now(); }, [current?.id]);

  const save = async () => {
    if (!pending.current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    const body = pending.current;
    const revision = generation.current;
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch("/api/japanese-study/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" }, body, signal: abort.signal,
      });
      if (revision !== generation.current) return;
      if (!response.ok) { setError(requestError(response.status, "save")); return; }
      const data = japaneseStudyResultSchema.parse(await response.json());
      if (data.promptId !== JSON.parse(body).promptId) throw new Error("Review identity mismatch");
      if (revision !== generation.current) return;
      pending.current = null; resultRef.current = data; setResult(data);
      setUnlocked(data.unlocked);
      setRpg(studyRpgProgressFromTotalXp(data.totalStudyXp));
      setScore(previous => ({ xp: previous.xp + data.xpGained, correct: previous.correct + (data.correct ? 1 : 0), wrong: previous.wrong + (data.correct ? 0 : 1) }));
      onReviewSaved?.();
    } catch {
      if (revision === generation.current) setError("save");
    } finally {
      if (revision === generation.current) { inFlight.current = false; setBusy(false); }
    }
  };

  const choose = (choiceId: string) => {
    if (!current || pending.current || resultRef.current || inFlight.current || error) return;
    pending.current = JSON.stringify({ promptId: current.id, choiceId, ...(queue && "dayKey" in queue ? { dailyDayKey: queue.dayKey } : {}), answerTimeMs: Math.min(300_000, Math.max(0, Date.now() - shownAt.current)) });
    setSelected(choiceId); void save();
  };
  const next = () => {
    if (!resultRef.current || inFlight.current) return;
    resultRef.current = null; setResult(null); setSelected(null);
    if (index + 1 >= (queue?.cards.length ?? 0)) setFinished(true);
    else setIndex(previous => previous + 1);
  };
  return { queue, current, index, loading, busy, error, result, unlocked, selected, finished, score, rpg,
    locked: busy || !!pending.current || !!result || !!error, choose, next, retry: save, loadQueue };
}
