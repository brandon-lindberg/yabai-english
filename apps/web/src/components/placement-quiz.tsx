"use client";

import type { PlacementQuestionPublic } from "@/lib/placement-test";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type PlacementResult = {
  level: string;
  earned: number;
  max: number;
  sectionScores: Record<
    "grammar" | "vocabulary" | "reading" | "functional" | "writing",
    { earned: number; max: number; ratio: number }
  >;
  strengths: string[];
  improvements: string[];
  writingFeedback: string[];
  needsManualReview: boolean;
  manualReviewReasons: string[];
};

export function PlacementQuiz() {
  const t = useTranslations("placement");
  const locale = useLocale();
  const router = useRouter();
  const [questions, setQuestions] = useState<PlacementQuestionPublic[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [writingPromptJa, setWritingPromptJa] = useState("");
  const [writingPromptEn, setWritingPromptEn] = useState("");
  const [writingMinWords, setWritingMinWords] = useState(60);
  const [writingResponse, setWritingResponse] = useState("");
  const [attemptToken, setAttemptToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);

  useEffect(() => {
    void fetch("/api/placement")
      .then((r) => r.json())
      .then((data: {
        questions: PlacementQuestionPublic[];
        writingTask?: {
          promptJa: string;
          promptEn: string;
          minWords: number;
        };
        attemptToken?: string;
      }) => {
        setQuestions(data.questions ?? []);
        setAnswers(Array(data.questions?.length ?? 0).fill(-1));
        setAttemptToken(data.attemptToken ?? "");
        if (data.writingTask) {
          setWritingPromptJa(data.writingTask.promptJa);
          setWritingPromptEn(data.writingTask.promptEn);
          setWritingMinWords(data.writingTask.minWords);
        }
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
        body: JSON.stringify({ answers: nextAnswers, writingResponse, attemptToken }),
      });
      const data = (await res.json()) as PlacementResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("submitError"));
        return;
      }
      if (data.level) {
        setResult(data);
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
      setStep(questions.length);
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

  if (result) {
    const labelKey = `level.${result.level}` as const;
    const sectionOrder: Array<keyof PlacementResult["sectionScores"]> = [
      "grammar",
      "vocabulary",
      "reading",
      "functional",
      "writing",
    ];
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: "var(--app-success-border)", background: "var(--app-success-bg)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--app-success-text)" }}>
          {t("resultTitle")}
        </p>
        <p className="mt-2 text-xl font-bold text-foreground">{t(labelKey)}</p>
        <p className="mt-1 text-sm text-muted">
          {t("scoreSummary", { earned: result.earned, max: result.max })}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {sectionOrder.map((sectionKey) => {
            const section = result.sectionScores[sectionKey];
            return (
              <div key={sectionKey} className="rounded-xl border border-border bg-background px-3 py-2 text-left text-sm">
                <p className="font-semibold text-foreground">{t(`section.${sectionKey}` as const)}</p>
                <p className="text-xs text-muted">
                  {Math.round(section.ratio * 100)}% ({section.earned}/{section.max})
                </p>
              </div>
            );
          })}
        </div>

        {result.strengths.length > 0 && (
          <div className="mt-4 text-left">
            <p className="text-sm font-semibold text-foreground">{t("strengthsTitle")}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.strengths.map((key) => (
                <li key={key}>{t(`section.${key}` as const)}</li>
              ))}
            </ul>
          </div>
        )}

        {result.improvements.length > 0 && (
          <div className="mt-3 text-left">
            <p className="text-sm font-semibold text-foreground">{t("improvementsTitle")}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.improvements.map((key) => (
                <li key={key}>{t(`section.${key}` as const)}</li>
              ))}
            </ul>
          </div>
        )}

        {result.writingFeedback.length > 0 && (
          <div className="mt-3 text-left">
            <p className="text-sm font-semibold text-foreground">{t("writingFeedbackTitle")}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.writingFeedback.map((code) => (
                <li key={code}>{t(`writingFeedback.${code}` as const)}</li>
              ))}
            </ul>
          </div>
        )}
        {result.needsManualReview && (
          <p className="mt-3 rounded-xl border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-3 py-2 text-sm text-[var(--app-warning-text)]">
            {t("manualReviewNotice")}
          </p>
        )}

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
        {t("progress", { current: step + 1, total: questions.length + 1 })}
      </p>
      {step < questions.length && q ? (
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
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-base font-medium text-foreground">
            {isJa ? writingPromptJa : writingPromptEn}
          </p>
          <p className="mt-2 text-xs text-muted">{t("writingWordGuide", { min: writingMinWords })}</p>
          <textarea
            value={writingResponse}
            onChange={(e) => setWritingResponse(e.target.value)}
            className="mt-3 min-h-36 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder={t("writingPlaceholder")}
          />
          <button
            type="button"
            disabled={submitting || writingResponse.trim().split(/\s+/).filter(Boolean).length < 20}
            onClick={() => void onFinish(answers)}
            className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {t("submitPlacement")}
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--app-danger)" }} role="alert">
          {error}
        </p>
      )}
      {submitting && <p className="text-sm text-muted">{t("submitting")}</p>}
    </div>
  );
}
