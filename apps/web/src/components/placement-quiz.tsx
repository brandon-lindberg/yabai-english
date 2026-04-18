"use client";

import { placementTextToReact } from "@/lib/placement-question-display";
import type { PlacementQuestionPublic } from "@/lib/placement-test";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function formatPlacementEligibleDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (locale.startsWith("ja")) {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "UTC" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

type PlacementResult = {
  level: string;
  subLevel: 1 | 2 | 3;
  earned: number;
  max: number;
  sectionScores: Record<
    "grammar" | "vocabulary" | "reading" | "functional",
    { earned: number; max: number; ratio: number }
  >;
  strengths: string[];
  improvements: string[];
  needsManualReview: boolean;
  manualReviewReasons: string[];
};

export function PlacementQuiz() {
  const t = useTranslations("placement");
  const locale = useLocale();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [question, setQuestion] = useState<PlacementQuestionPublic | null>(null);
  const [objectiveComplete, setObjectiveComplete] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(1);
  const [progressTotal, setProgressTotal] = useState(24);
  const [attemptToken, setAttemptToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [cooldownEligibleAt, setCooldownEligibleAt] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/placement?ts=${Date.now()}`, { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as {
          error?: string;
          eligibleAt?: string;
          question?: PlacementQuestionPublic | null;
          attemptToken?: string;
          expiresAt?: number;
          progress?: { current: number; total: number };
        };
        if (!r.ok) {
          if (data.error === "cooldown" && typeof data.eligibleAt === "string") {
            setCooldownEligibleAt(data.eligibleAt);
            return;
          }
          setError(data.error ?? t("loadError"));
          return;
        }
        setQuestion(data.question ?? null);
        setObjectiveComplete(false);
        setProgressCurrent(data.progress?.current ?? 1);
        setProgressTotal(data.progress?.total ?? 24);
        setAttemptToken(data.attemptToken ?? "");
        setAutoSubmitted(false);
        setExpiresAt(data.expiresAt ?? null);
        if (typeof data.expiresAt === "number") {
          setRemainingSec(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
        }
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemainingSec(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (remainingSec !== 0) return;
    if (autoSubmitted || submitting || result) return;
    setAutoSubmitted(true);
    void onFinish(true);
  }, [remainingSec, autoSubmitted, submitting, result]); // eslint-disable-line react-hooks/exhaustive-deps -- onFinish would loop

  const q = question;
  const isJa = locale === "ja";

  async function onFinish(fromTimeout = false) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finish",
          attemptToken,
        }),
      });
      const data = (await res.json()) as PlacementResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("submitError"));
        return;
      }
      if (fromTimeout) {
        setError(t("timeExpired"));
      }
      if (data.level) {
        setResult(data);
        void updateSession();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function selectOption(idx: number) {
    if (!q || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          answer: idx,
          attemptToken,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        attemptToken?: string;
        question?: PlacementQuestionPublic | null;
        objectiveComplete?: boolean;
        progress?: { current: number; total: number };
        expiresAt?: number;
      };
      if (!res.ok) {
        setError(data.error ?? t("submitError"));
        return;
      }
      setAttemptToken(data.attemptToken ?? attemptToken);
      setQuestion(data.question ?? null);
      setObjectiveComplete(Boolean(data.objectiveComplete));
      setProgressCurrent(data.progress?.current ?? progressCurrent);
      setProgressTotal(data.progress?.total ?? progressTotal);
      if (typeof data.expiresAt === "number") {
        setExpiresAt(data.expiresAt);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        data-testid="placement-quiz-loading"
      >
        {/* Timer */}
        <Skeleton height="4" width="1/3" />
        {/* Progress */}
        <Skeleton height="3" width="1/4" />
        {/* Question card — mirrors the real quiz layout */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          {/* Instruction */}
          <Skeleton height="3" width="full" />
          <div className="mt-1">
            <Skeleton height="3" width="2/3" />
          </div>
          {/* Question prompt */}
          <div className="mt-3">
            <Skeleton height="5" width="3/4" />
          </div>
          {/* Answer options */}
          <ul className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="rounded-xl border border-border px-3 py-3 sm:px-4">
                  <Skeleton height="4" width="3/4" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (cooldownEligibleAt) {
    const dateLabel = formatPlacementEligibleDate(cooldownEligibleAt, locale);
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <p className="text-base font-semibold text-foreground">{t("cooldownTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("cooldownBody", { date: dateLabel })}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("cooldownBack")}
        </Link>
      </div>
    );
  }

  if (!question && !objectiveComplete) {
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
    ];
    return (
      <div className="rounded-2xl border p-4 sm:p-6" style={{ borderColor: "var(--app-success-border)", background: "var(--app-success-bg)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--app-success-text)" }}>
          {t("resultTitle")}
        </p>
        <p className="mt-2 text-lg font-bold text-foreground sm:text-xl">{t(labelKey)}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {t("subLevelLabel", { subLevel: result.subLevel })}
        </p>
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
      {remainingSec !== null && (
        <p className="text-sm font-medium text-foreground">
          {t("timeRemaining")}: {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
        </p>
      )}
      <p className="text-xs text-muted">
        {t("progress", { current: progressCurrent, total: progressTotal })}
      </p>
      {!objectiveComplete && q ? (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-muted">
            {placementTextToReact(isJa ? q.instructionJa : q.instructionEn)}
          </p>
          {/* Stimulus and answers stay English: this is an English test; JA locale only affects instructions. */}
          <p className="mt-3 text-base font-semibold text-foreground">
            {placementTextToReact(q.questionEn)}
          </p>
          <ul className="mt-4 space-y-2">
            {q.optionsEn.map((opt, idx) => (
              <li key={`${q.id}-${idx}`}>
                <button
                  type="button"
                  disabled={submitting || remainingSec === 0}
                  onClick={() => void selectOption(idx)}
                  className="w-full rounded-xl border border-border px-3 py-3 text-left text-sm text-foreground transition hover:border-accent/60 hover:bg-[var(--app-hover)] disabled:opacity-50 sm:px-4"
                >
                  {placementTextToReact(opt)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <p className="text-base font-medium text-foreground">{t("objectiveComplete")}</p>
          <p className="mt-2 text-xs text-muted">{t("submitWhenReady")}</p>
          <button
            type="button"
            disabled={submitting || remainingSec === 0}
            onClick={() => void onFinish(false)}
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
