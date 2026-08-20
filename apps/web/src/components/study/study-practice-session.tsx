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
import { Button, buttonClasses } from "@/components/ui/button";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Outcome } from "@/components/ui/outcome";
import { Status } from "@/components/ui/status";

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
        <div className="border-y border-border py-4">
          <Skeleton height="4" width="1/2" />
          <div className="mt-3">
            <Skeleton height="3" width="full" rounded="full" />
          </div>
          <div className="mt-2">
            <Skeleton height="3" width="2/3" />
          </div>
        </div>
        {/* Progress + score */}
        <div className="flex flex-wrap justify-between gap-2">
          <Skeleton height="3" width="1/4" className="!w-12" />
          <Skeleton height="3" width="1/3" className="!w-36" />
        </div>
        {/* Flashcard */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8">
          <div className="min-h-[6rem] sm:min-h-[8rem]">
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
            <div key={i} className="rounded-xl border border-border px-4 py-3">
              <Skeleton height="4" width="3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert">
        <Status tone="error">{error}</Status>
      </p>
    );
  }

  if (finished) {
    return (
      /* The XP earned is what the session was for, so it is the figure. It used
         to be the second grey line under a bold "Session complete". */
      <Outcome
        title={t("sessionDone")}
        figure={sessionXp}
        figureLabel={t("sessionXp", { xp: sessionXp })}
        description={t("sessionScore", { correct: sessionCorrect, wrong: sessionWrong })}
        actions={
          <>
            <Button onClick={() => void loadQueue()}>{t("nextCard")}</Button>
            <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>
              {t("backToHub")}
            </Link>
          </>
        }
      />
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
      <Outcome
        title={emptyMsg}
        actions={
          <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>
            {t("backToHub")}
          </Link>
        }
      />
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

      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
        <span className="font-medium tabular-nums">
          {index + 1} / {cards.length}
        </span>
        <span className="tabular-nums">
          {t("sessionXp", { xp: sessionXp })} ·{" "}
          {t("sessionScore", { correct: sessionCorrect, wrong: sessionWrong })}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8">
        {/*
          The Japanese prompt is the content of this screen, not a caption, so it
          is set at display scale. The uppercase tracked label that used to sit
          above it was an eyebrow — banned outright by the craft floor — and it
          is now a screen-reader label, which is the only job it was doing.
        */}
        <p className="sr-only">{promptLabel}</p>
        <p className="whitespace-pre-line text-[clamp(1.5rem,4.5vw,2.5rem)] font-black leading-[1.25] tracking-[-0.02em] text-foreground">
          {current.frontJa}
        </p>
        <p className="mt-4 text-base font-medium text-foreground sm:mt-6">{taskHint}</p>
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
              steps={current.steps}
              disabled={submitting}
              onSubmit={(answers) => void submitMultiStep(answers)}
            />
          </div>
        ) : null}
      </div>

      {/* Feedback is a live region: it appears and is gone in 900ms, so a screen
          reader has to be told rather than left to find it. */}
      {feedback ? (
        <div role="status" aria-live="assertive" className="text-center">
          <Status tone={feedback === "correct" ? "settled" : "error"}>
            {feedback === "correct" ? t("feedbackCorrect") : t("feedbackWrong")}
          </Status>
          {feedback === "wrong" && lastCorrectAnswer ? (
            <p className="mt-2 whitespace-pre-line text-sm text-muted">
              {t("correctWas", { answer: lastCorrectAnswer })}
            </p>
          ) : null}
        </div>
      ) : null}

      {!feedback && current.kind === "mcq" ? (
        <ChoiceList columns={current.options.length <= 3 ? 3 : 2}>
          {current.options.map((opt) => (
            <Choice
              key={`${current.id}-${opt}`}
              disabled={submitting}
              onSelect={() => void submitMcq(opt)}
            >
              {opt}
            </Choice>
          ))}
        </ChoiceList>
      ) : null}
    </div>
  );
}
