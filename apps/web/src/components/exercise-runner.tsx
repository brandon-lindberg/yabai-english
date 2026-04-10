"use client";

import { useLocale } from "next-intl";
import { useState } from "react";

export type ExercisePayload = {
  id: string;
  type: string;
  content: unknown;
  points: number;
};

type Props = {
  exercise: ExercisePayload;
};

type McContent = {
  promptJa?: string;
  promptEn?: string;
  options: string[];
  correctIndex: number;
};

function isMc(content: unknown): content is McContent {
  if (!content || typeof content !== "object") return false;
  const c = content as McContent;
  return Array.isArray(c.options) && typeof c.correctIndex === "number";
}

export function ExerciseRunner({ exercise }: Props) {
  const locale = useLocale();
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submitMc(choiceIndex: number, content: McContent) {
    const correct = choiceIndex === content.correctIndex;
    const score = correct ? exercise.points : 0;
    setSubmitted(choiceIndex);
    setFeedback(correct ? "正解 / Correct!" : "もう一度試してください。 / Try again.");

    await fetch("/api/learn/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: exercise.id,
        response: { choiceIndex },
        score,
      }),
    });
  }

  if (exercise.type === "MULTIPLE_CHOICE" && isMc(exercise.content)) {
    const content = exercise.content;
    const prompt =
      locale === "ja"
        ? (content.promptJa ?? content.promptEn ?? "")
        : (content.promptEn ?? content.promptJa ?? "");

    return (
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="font-medium text-foreground">{prompt}</p>
        <ul className="mt-4 space-y-2">
          {content.options.map((opt, idx) => {
            const selected = submitted === idx;
            const isCorrect = idx === content.correctIndex && submitted !== null;
            const isWrong = selected && !isCorrect;
            return (
              <li key={opt}>
                <button
                  type="button"
                  disabled={submitted !== null}
                  onClick={() => void submitMc(idx, content)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm text-foreground transition disabled:cursor-not-allowed ${
                    isCorrect
                      ? "border-[var(--app-success-border)] bg-[var(--app-success-bg)]"
                      : isWrong
                        ? "border-[var(--app-danger)] bg-[color-mix(in_srgb,var(--app-danger)_12%,var(--app-surface))]"
                        : "border-border hover:border-accent/50 hover:bg-[var(--app-hover)]"
                  }`}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        {feedback && (
          <p className="mt-3 text-sm text-muted" role="status">
            {feedback}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
      Unsupported exercise type: {exercise.type}
    </div>
  );
}
