"use client";

import type { PlacementQuestionPublic } from "@/lib/placement-test";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

export function PlacementQuiz() {
  const t = useTranslations("placement");
  const locale = useLocale();
  const router = useRouter();
  const [questions, setQuestions] = useState<PlacementQuestionPublic[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLevel, setResultLevel] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/placement")
      .then((r) => r.json())
      .then((data: { questions: PlacementQuestionPublic[] }) => {
        setQuestions(data.questions ?? []);
        setAnswers(Array(data.questions?.length ?? 0).fill(-1));
      })
      .finally(() => setLoading(false));
  }, []);

  const q = questions[step];
  const isJa = locale === "ja";

  async function onFinish(nextAnswers: number[]) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const data = (await res.json()) as { level?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? t("submitError"));
        return;
      }
      if (data.level) {
        setResultLevel(data.level);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function selectOption(idx: number) {
    if (!q) return;
    const next = [...answers];
    next[step] = idx;
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      void onFinish(next);
    }
  }

  if (loading) {
    return <p className="text-muted">{t("loading")}</p>;
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--app-danger)" }}>
        {t("loadError")}
      </p>
    );
  }

  if (resultLevel) {
    const labelKey = `level.${resultLevel}` as const;
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{
          borderColor: "var(--app-success-border)",
          background: "var(--app-success-bg)",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--app-success-text)" }}>
          {t("resultTitle")}
        </p>
        <p className="mt-2 text-xl font-bold text-foreground">{t(labelKey)}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("backToDashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        {t("progress", { current: step + 1, total: questions.length })}
      </p>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-base font-medium text-foreground">
          {isJa ? q.promptJa : q.promptEn}
        </p>
        <ul className="mt-4 space-y-2">
          {(isJa ? q.optionsJa : q.optionsEn).map((opt, idx) => (
            <li key={opt}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => selectOption(idx)}
                className="w-full rounded-xl border border-border px-4 py-3 text-left text-sm text-foreground transition hover:border-accent/60 hover:bg-[var(--app-hover)] disabled:opacity-50"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--app-danger)" }} role="alert">
          {error}
        </p>
      )}
      {submitting && <p className="text-sm text-muted">{t("submitting")}</p>}
    </div>
  );
}
