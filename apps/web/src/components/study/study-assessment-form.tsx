"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

type Item = { id: string; promptJa: string; promptEn: string; options: string[] };

export function StudyAssessmentForm({ assessmentId }: { assessmentId: string }) {
  const t = useTranslations("study");
  const locale = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    passingScore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/study/assessment/${encodeURIComponent(assessmentId)}`);
        if (!res.ok) {
          setError("Failed to load test");
          return;
        }
        const data = (await res.json()) as {
          items: Item[];
          passingScore: number;
        };
        if (!cancelled) {
          setItems(data.items);
          setPassingScore(data.passingScore);
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/study/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, answers }),
      });
      if (!res.ok) {
        setError("Submit failed");
        return;
      }
      const data = (await res.json()) as { score: number; passed: boolean; passingScore: number };
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">…</p>;
  }

  if (error && !items.length) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-lg font-semibold text-foreground">
          {t("scoreResult", { score: result.score })}
        </p>
        <p className="mt-2 text-muted">
          {result.passed ? t("passedUnlock") : t("failedTest")}
        </p>
        <Link
          href="/learn/study"
          className="mt-6 inline-block rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {t("backToHub")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Pass mark: {passingScore}% · {items.length} questions
      </p>
      {items.map((item, idx) => (
        <fieldset key={item.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <legend className="px-1 text-xs font-medium text-muted">
            {t("questionOf", { n: idx + 1, total: items.length })}
          </legend>
          <p className="mt-2 whitespace-pre-line text-base font-medium text-foreground">
            {locale === "ja" ? item.promptJa : item.promptEn}
          </p>
          <div className="mt-4 space-y-2">
            {item.options.map((opt, i) => (
              <label
                key={`${item.id}-${i}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-foreground/5"
              >
                <input
                  type="radio"
                  name={item.id}
                  checked={answers[item.id] === i}
                  onChange={() => setAnswers((a) => ({ ...a, [item.id]: i }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={submitting || Object.keys(answers).length < items.length}
        onClick={() => void submit()}
        className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        {t("submitTest")}
      </button>
    </div>
  );
}
