"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function StudyMultiStepExercise({
  cardId,
  steps,
  disabled,
  onSubmit,
}: {
  cardId: string;
  steps: { prompt: string }[];
  disabled: boolean;
  onSubmit: (answers: string[]) => void;
}) {
  const t = useTranslations("study");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => steps.map(() => ""));

  const setPart = (i: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const isLast = step >= steps.length - 1;
  const current = steps[step];
  if (!current) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted">
        {t("stepProgress", { n: step + 1, total: steps.length })}
      </p>
      <p className="whitespace-pre-line text-base font-medium text-foreground">{current.prompt}</p>
      <label className="block text-xs font-medium text-muted" htmlFor={`study-step-${cardId}-${step}`}>
        {t("yourAnswer")}
      </label>
      <textarea
        id={`study-step-${cardId}-${step}`}
        rows={4}
        disabled={disabled}
        value={answers[step] ?? ""}
        onChange={(e) => setPart(step, e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
      />
      {!isLast ? (
        <button
          type="button"
          disabled={disabled || !(answers[step] ?? "").trim()}
          onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          {t("nextStep")}
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled || steps.some((_, i) => !(answers[i] ?? "").trim())}
          onClick={() => onSubmit(answers)}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          {t("submitAnswers")}
        </button>
      )}
    </div>
  );
}
