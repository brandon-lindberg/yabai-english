"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Status } from "@/components/ui/status";
import type { PublicExerciseContent } from "@/lib/learn/exercise-grading";

/**
 * One lesson exercise.
 *
 * The verdict comes from the server. This component used to receive the whole
 * stored `content` — answer key included — decide for itself whether the
 * learner was right, and post the resulting score. It now receives only what a
 * learner may see, and learns the outcome from the response to its own POST.
 */

export type ExercisePayload = {
  id: string;
  type: string;
  /** Answer key already stripped; null when the type cannot be graded. */
  content: PublicExerciseContent | null;
};

type Outcome = {
  correct: boolean;
  correctIndex: number;
};

export function ExerciseRunner({ exercise }: { exercise: ExercisePayload }) {
  const locale = useLocale();
  const t = useTranslations("learn");
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failed, setFailed] = useState(false);

  const content = exercise.content;

  async function submitMc(choiceIndex: number) {
    // Lock the row immediately so a second click cannot land while the grade is
    // in flight; the result fills in when the server answers.
    setChosenIndex(choiceIndex);
    setFailed(false);
    try {
      const res = await fetch("/api/learn/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          response: { choiceIndex },
        }),
      });
      if (!res.ok) {
        setChosenIndex(null);
        setFailed(true);
        return;
      }
      const data = (await res.json()) as Outcome;
      setOutcome({ correct: data.correct, correctIndex: data.correctIndex });
    } catch {
      setChosenIndex(null);
      setFailed(true);
    }
  }

  if (exercise.type !== "MULTIPLE_CHOICE" || !content) {
    return (
      <p className="border-y border-border py-6 text-sm text-muted">
        {t("unsupportedExercise", { type: exercise.type })}
      </p>
    );
  }

  const prompt =
    locale === "ja"
      ? (content.promptJa ?? content.promptEn ?? "")
      : (content.promptEn ?? content.promptJa ?? "");

  return (
    <div className="border-t border-border pt-6">
      <p className="text-lg font-bold leading-snug tracking-[-0.02em] text-foreground">{prompt}</p>
      <ChoiceList className="mt-6">
        {content.options.map((opt, idx) => {
          // Until the server has graded, nothing is marked right or wrong —
          // the client no longer knows, which is the point.
          const isCorrect = outcome !== null && idx === outcome.correctIndex;
          const isWrong = outcome !== null && idx === chosenIndex && !outcome.correct;
          const isPending = outcome === null && idx === chosenIndex;
          return (
            <Choice
              key={opt}
              disabled={chosenIndex !== null}
              onSelect={() => void submitMc(idx)}
              state={
                isCorrect ? "correct" : isWrong ? "wrong" : isPending ? "selected" : "idle"
              }
              stateLabel={isCorrect ? t("answerCorrect") : isWrong ? t("answerWrong") : undefined}
            >
              {opt}
            </Choice>
          );
        })}
      </ChoiceList>
      {outcome ? (
        <p className="mt-4" role="status" aria-live="polite">
          <Status tone={outcome.correct ? "settled" : "error"}>
            {outcome.correct ? t("answerCorrect") : t("answerWrong")}
          </Status>
        </p>
      ) : null}
      {failed ? (
        <p className="mt-4" role="alert">
          <Status tone="error">{t("attemptFailed")}</Status>
        </p>
      ) : null}
    </div>
  );
}
