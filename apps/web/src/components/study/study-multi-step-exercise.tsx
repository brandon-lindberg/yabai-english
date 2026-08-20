"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

export function StudyMultiStepExercise({
  steps,
  disabled,
  onSubmit,
}: {
  /* `cardId` used to be threaded in purely to hand-build a unique textarea id.
     `Field` generates one, so the prop is gone rather than left unused. */
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
      <p className="text-sm font-medium tabular-nums text-muted">
        {t("stepProgress", { n: step + 1, total: steps.length })}
      </p>
      <p className="whitespace-pre-line text-base font-medium text-foreground">{current.prompt}</p>
      <Field label={t("yourAnswer")}>
        {(field) => (
          <Textarea
            {...field}
            rows={4}
            disabled={disabled}
            value={answers[step] ?? ""}
            onChange={(e) => setPart(step, e.target.value)}
          />
        )}
      </Field>
      {!isLast ? (
        <Button
          disabled={disabled || !(answers[step] ?? "").trim()}
          onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
        >
          {t("nextStep")}
        </Button>
      ) : (
        <Button
          disabled={disabled || steps.some((_, i) => !(answers[i] ?? "").trim())}
          onClick={() => onSubmit(answers)}
        >
          {t("submitAnswers")}
        </Button>
      )}
    </div>
  );
}
