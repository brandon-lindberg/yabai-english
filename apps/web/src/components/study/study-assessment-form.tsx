"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { ChoiceList, ChoiceRadio } from "@/components/ui/choice";
import { Outcome } from "@/components/ui/outcome";
import { Status } from "@/components/ui/status";

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
    return (
      <div
        className="space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading assessment"
        data-testid="study-assessment-loading"
      >
        {/* Pass mark info */}
        <Skeleton height="4" width="2/3" />

        {/* Question blocks — mirrors real layout */}
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="border-t border-border pt-6">
            {/* Question number */}
            <Skeleton height="3" width="1/4" className="!w-24" />
            {/* Prompt */}
            <div className="mt-2">
              <Skeleton height="6" width="full" />
              <div className="mt-1">
                <Skeleton height="6" width="2/3" />
              </div>
            </div>
            {/* Radio options */}
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div
                  key={j}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <Skeleton height="5" width="1/4" rounded="full" className="!h-5 !w-5 shrink-0" />
                  <Skeleton height="4" width="3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Submit button */}
        <Skeleton height="12" width="full" rounded="full" />
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <p role="alert">
        <Status tone="error">{error}</Status>
      </p>
    );
  }

  if (result) {
    return (
      <Outcome
        title={t("scoreResult", { score: result.score })}
        figure={`${result.score}%`}
        figureLabel={t("passMarkLabel", { score: result.passingScore })}
        description={result.passed ? t("passedUnlock") : t("failedTest")}
        actions={
          <Link href="/learn/study" className={buttonClasses()}>
            {t("backToHub")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted">
        {/* Was hard-coded English in a bilingual product. */}
        {t("passMarkLabel", { score: passingScore })} ·{" "}
        {t("questionCount", { count: items.length })}
      </p>
      {items.map((item, idx) => (
        /* The rule lives on the wrapper, not the fieldset: a `legend` cuts a gap
           in its own fieldset's border, which broke the rule mid-line. */
        <div key={item.id} className="border-t border-border pt-6">
          <fieldset>
            <legend className="text-sm font-medium tabular-nums text-muted">
              {t("questionOf", { n: idx + 1, total: items.length })}
            </legend>
            <p className="mt-2 whitespace-pre-line text-lg font-bold leading-snug tracking-[-0.02em] text-foreground">
              {locale === "ja" ? item.promptJa : item.promptEn}
            </p>
            <ChoiceList className="mt-4">
              {item.options.map((opt, i) => (
                <ChoiceRadio
                  key={`${item.id}-${i}`}
                  name={item.id}
                  checked={answers[item.id] === i}
                  state={answers[item.id] === i ? "selected" : "idle"}
                  onSelect={() => setAnswers((a) => ({ ...a, [item.id]: i }))}
                >
                  {opt}
                </ChoiceRadio>
              ))}
            </ChoiceList>
          </fieldset>
        </div>
      ))}
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <Button
        size="lg"
        fullWidth
        loading={submitting}
        disabled={Object.keys(answers).length < items.length}
        onClick={() => void submit()}
      >
        {t("submitTest")}
      </Button>
    </div>
  );
}
