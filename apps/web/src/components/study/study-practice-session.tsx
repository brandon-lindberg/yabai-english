"use client";

import { StudyMultiStepExercise } from "@/components/study/study-multi-step-exercise";
import { StudyReorderExercise } from "@/components/study/study-reorder-exercise";
import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import type { StudyQueueCard } from "@/lib/study/practice-queue-card";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { StudyLevelCode } from "@/generated/prisma/browser";
import { Skeleton } from "@/components/ui/skeleton";

export type StudyQueueFocus = "mixed" | "weak" | "mastered";

export function StudyPracticeSession({
  levelCode,
  initialRpg,
  queueFocus = "mixed",
}: {
  levelCode: StudyLevelCode;
  initialRpg: StudyRpgSnapshot;
  queueFocus?: StudyQueueFocus;
}) {
  const t = useTranslations("study");
  const [rpg, setRpg] = useState<StudyRpgSnapshot>(initialRpg);
  const [cards, setCards] = useState<StudyQueueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<"no_weak_cards" | "no_mastered_cards" | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string | null>(null);
  const promptShownAtMs = useRef<number>(0);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyReason(null);
    try {
      const res = await fetch(
        `/api/study/queue?trackSlug=english-flashcards&levelCode=${encodeURIComponent(levelCode)}&limit=24&focus=${encodeURIComponent(queueFocus)}`,
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${res.status}`);
        setCards([]);
        return;
      }
      const data = (await res.json()) as {
        cards: StudyQueueCard[];
        emptyReason?: "no_weak_cards" | "no_mastered_cards";
      };
      setCards(data.cards);
      if (data.cards.length === 0 && data.emptyReason) {
        setEmptyReason(data.emptyReason);
      }
      setIndex(0);
      setFinished(false);
      setFeedback(null);
      setLastCorrectAnswer(null);
    } catch {
      setError("Network error");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [levelCode, queueFocus]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setRpg(initialRpg);
  }, [initialRpg]);

  const current = cards[index];

  useEffect(() => {
    if (current) {
      promptShownAtMs.current = Date.now();
    }
  }, [current]);

  const advanceAfterResult = async (data: {
    correct: boolean;
    correctAnswer: string;
    xpGained?: number;
    rpg?: StudyRpgSnapshot;
  }) => {
    setSessionXp((x) => x + (data.xpGained ?? 0));
    if (data.rpg) setRpg(data.rpg);
    if (data.correct) {
      setSessionCorrect((c) => c + 1);
      setFeedback("correct");
    } else {
      setSessionWrong((w) => w + 1);
      setFeedback("wrong");
      setLastCorrectAnswer(data.correctAnswer);
    }

    await new Promise((r) => setTimeout(r, 900));

    setFeedback(null);
    setLastCorrectAnswer(null);
    if (index + 1 >= cards.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const postReview = async (body: Record<string, unknown>) => {
    if (!current || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const answerTimeMs = Math.max(0, Date.now() - promptShownAtMs.current);
    try {
      const res = await fetch("/api/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: current.id, answerTimeMs, ...body }),
      });
      if (!res.ok) {
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as {
        correct: boolean;
        correctAnswer: string;
        xpGained?: number;
        rpg?: StudyRpgSnapshot;
      };
      await advanceAfterResult(data);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitMcq = (chosenAnswer: string) => void postReview({ chosenAnswer });

  const submitReorder = (reorderTokenIds: string[]) => void postReview({ reorderTokenIds });

  const submitMultiStep = (multiStepAnswers: string[]) => void postReview({ multiStepAnswers });

  if (loading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading practice"
        data-testid="study-practice-loading"
      >
        {/* XP bar */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <Skeleton height="4" width="1/2" />
          <div className="mt-1">
            <Skeleton height="3" width="1/3" />
          </div>
          <div className="mt-2">
            <Skeleton height="3" width="full" rounded="full" />
          </div>
          <div className="mt-1">
            <Skeleton height="3" width="2/3" />
          </div>
        </div>
        {/* Progress + score */}
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <Skeleton height="3" width="1/4" className="!w-12" />
          <Skeleton height="3" width="1/3" className="!w-36" />
        </div>
        {/* Flashcard */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-8">
          <Skeleton height="3" width="1/4" />
          <div className="mt-3 min-h-[6rem] sm:min-h-[8rem]">
            <Skeleton height="8" width="3/4" />
            <div className="mt-3">
              <Skeleton height="6" width="1/2" />
            </div>
          </div>
          <div className="mt-4 sm:mt-6">
            <Skeleton height="4" width="2/3" />
          </div>
        </div>
        {/* Answer options */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface px-4 py-4"
            >
              <Skeleton height="4" width="3/4" />
              <div className="mt-1">
                <Skeleton height="3" width="1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-foreground">{t("sessionDone")}</p>
        <p className="mt-2 text-muted">{t("sessionXp", { xp: sessionXp })}</p>
        <p className="mt-1 text-sm text-muted">
          {t("sessionScore", { correct: sessionCorrect, wrong: sessionWrong })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            {t("nextCard")}
          </button>
          <Link
            href="/learn/study"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            {t("backToHub")}
          </Link>
        </div>
      </div>
    );
  }

  if (!current || cards.length === 0) {
    const emptyMsg =
      emptyReason === "no_weak_cards"
        ? t("queueEmptyWeak")
        : emptyReason === "no_mastered_cards"
          ? t("queueEmptyMastered")
          : t("sessionEmpty");
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-muted">{emptyMsg}</p>
        <Link href="/learn/study" className="mt-4 inline-block text-link">
          {t("backToHub")}
        </Link>
      </div>
    );
  }

  const promptLabel =
    current.kind === "mcq" ? t("frontLabel") : t("promptLabel");

  const taskHint =
    current.kind === "mcq"
      ? t("chooseEnglish")
      : current.kind === "reorder"
        ? t("reorderInstructions")
        : t("multiStepInstructions");

  return (
    <div className="space-y-6">
      {queueFocus !== "mixed" ? (
        <p className="text-xs text-muted">{t("practiceFocusHint")}</p>
      ) : null}

      <StudyRpgXpBar
        title={t("rpgRankTitle", { rank: rpg.rank })}
        fractionLabel={t("rpgXpLine", { into: rpg.xpIntoRank, total: rpg.xpForNextRank })}
        nextHint={t("rpgNextHint", {
          remaining: Math.max(0, rpg.xpForNextRank - rpg.xpIntoRank),
          nextRank: rpg.rank + 1,
        })}
        progressPercent={rpg.progressPercent}
      />

      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>
          {t("sessionXp", { xp: sessionXp })} · {t("sessionScore", { correct: sessionCorrect, wrong: sessionWrong })}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{promptLabel}</p>
        <p className="mt-3 whitespace-pre-line text-xl font-semibold text-foreground sm:text-2xl">{current.frontJa}</p>
        <p className="mt-4 text-sm font-medium text-foreground sm:mt-6">{taskHint}</p>
        {current.kind === "reorder" ? (
          <div className="mt-6">
            <StudyReorderExercise
              key={current.id}
              tokens={current.tokens}
              disabled={submitting}
              onCheck={(ids) => void submitReorder(ids)}
            />
          </div>
        ) : null}
        {current.kind === "multi_step" ? (
          <div className="mt-6">
            <StudyMultiStepExercise
              key={current.id}
              cardId={current.id}
              steps={current.steps}
              disabled={submitting}
              onSubmit={(answers) => void submitMultiStep(answers)}
            />
          </div>
        ) : null}
      </div>

      {feedback === "correct" ? (
        <p className="rounded-xl bg-green-500/15 px-4 py-3 text-center text-sm font-medium text-green-800 dark:text-green-300">
          {t("feedbackCorrect")}
        </p>
      ) : null}
      {feedback === "wrong" ? (
        <div className="rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-900 dark:text-red-200">
          <p className="font-medium">{t("feedbackWrong")}</p>
          {lastCorrectAnswer ? (
            <p className="mt-1 whitespace-pre-line text-muted-foreground">
              {t("correctWas", { answer: lastCorrectAnswer })}
            </p>
          ) : null}
        </div>
      ) : null}

      {!feedback && current.kind === "mcq" ? (
        <div
          className={`grid gap-2 ${current.options.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}
        >
          {current.options.map((opt) => (
            <button
              key={`${current.id}-${opt}`}
              type="button"
              disabled={submitting}
              onClick={() => void submitMcq(opt)}
              className="rounded-xl border border-border bg-surface px-4 py-4 text-left text-sm font-medium text-foreground transition hover:bg-foreground/5 disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
