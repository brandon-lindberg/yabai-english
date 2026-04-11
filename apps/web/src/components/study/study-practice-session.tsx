"use client";

import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { StudyLevelCode } from "@prisma/client";

/** `frontJa` matches API field name; content is Japanese-heavy at Beginner 1 and trends English upward. */
type QuizCard = { id: string; frontJa: string; options: string[] };

export function StudyPracticeSession({
  levelCode,
  initialRpg,
}: {
  levelCode: StudyLevelCode;
  initialRpg: StudyRpgSnapshot;
}) {
  const t = useTranslations("study");
  const [rpg, setRpg] = useState<StudyRpgSnapshot>(initialRpg);
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/study/queue?trackSlug=english-flashcards&levelCode=${encodeURIComponent(levelCode)}&limit=24`,
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${res.status}`);
        setCards([]);
        return;
      }
      const data = (await res.json()) as { cards: QuizCard[] };
      setCards(data.cards);
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
  }, [levelCode]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setRpg(initialRpg);
  }, [initialRpg]);

  const current = cards[index];

  const submitAnswer = async (chosenAnswer: string) => {
    if (!current || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: current.id, chosenAnswer }),
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
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-muted" data-testid="study-practice-loading">
        …
      </p>
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
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-muted">{t("sessionEmpty")}</p>
        <Link href="/learn/study" className="mt-4 inline-block text-link">
          {t("backToHub")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("frontLabel")}</p>
        <p className="mt-3 text-2xl font-semibold text-foreground">{current.frontJa}</p>
        <p className="mt-6 text-sm font-medium text-foreground">{t("chooseEnglish")}</p>
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
            <p className="mt-1 text-muted-foreground">
              {t("correctWas", { answer: lastCorrectAnswer })}
            </p>
          ) : null}
        </div>
      ) : null}

      {!feedback ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {current.options.map((opt) => (
            <button
              key={`${current.id}-${opt}`}
              type="button"
              disabled={submitting}
              onClick={() => void submitAnswer(opt)}
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
