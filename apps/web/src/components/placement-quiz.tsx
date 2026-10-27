"use client";

import { placementTextToReact } from "@/lib/placement-question-display";
import type { PlacementQuestionPublic, scorePlacementAnswers } from "@/lib/placement-test";
import { ENGLISH_PLACEMENT_POLICY_V2 } from "@/lib/placement-policy";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Outcome } from "@/components/ui/outcome";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";

function formatPlacementEligibleDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (locale.startsWith("ja")) {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "UTC" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

type PlacementResult = ReturnType<typeof scorePlacementAnswers>;

type InconclusiveReason = "insufficient_evidence" | "question_pool_exhausted" | "attempt_unavailable";

export function PlacementQuiz() {
  const t = useTranslations("placement");
  const locale = useLocale();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [question, setQuestion] = useState<PlacementQuestionPublic | null>(null);
  const [objectiveComplete, setObjectiveComplete] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(1);
  const [progressTotal, setProgressTotal] = useState<number>(ENGLISH_PLACEMENT_POLICY_V2.maxQuestions);
  const [minimumAnswers, setMinimumAnswers] = useState<number>(ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers);
  const [attemptToken, setAttemptToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [inconclusive, setInconclusive] = useState<{ reason: InconclusiveReason; required: number } | null>(null);
  const [cooldownEligibleAt, setCooldownEligibleAt] = useState<string | null>(null);

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setInconclusive(null);
    setError(null);
    setCooldownEligibleAt(null);
    setExpiresAt(null);
    setRemainingSec(null);
    setAutoSubmitted(false);
    setClockOffsetMs(0);
    setQuestion(null);
    setObjectiveComplete(false);
    setAttemptToken("");
    try {
      const r = await fetch(`/api/placement?ts=${Date.now()}`, { cache: "no-store" });
      const data = (await r.json()) as {
        error?: string;
        eligibleAt?: string;
        question?: PlacementQuestionPublic | null;
        attemptToken?: string;
        expiresAt?: number;
        minimumAnswers?: number;
        progress?: { current: number; total: number };
      };
      if (!r.ok) {
        if (data.error === "cooldown" && typeof data.eligibleAt === "string") {
          setCooldownEligibleAt(data.eligibleAt);
          return;
        }
        setError(t("loadError"));
        return;
      }
      setQuestion(data.question ?? null);
      setProgressCurrent(data.progress?.current ?? 1);
      setProgressTotal(data.progress?.total ?? ENGLISH_PLACEMENT_POLICY_V2.maxQuestions);
      setMinimumAnswers(data.minimumAnswers ?? ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers);
      setAttemptToken(data.attemptToken ?? "");
      setExpiresAt(data.expiresAt ?? null);
      if (typeof data.expiresAt === "number") {
        setRemainingSec(Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)));
      }
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    if (!expiresAt || result || inconclusive || autoSubmitted) return;
    const tick = () => setRemainingSec(Math.max(0, Math.ceil((expiresAt - Date.now() - clockOffsetMs) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, clockOffsetMs, result, inconclusive, autoSubmitted]);

  useEffect(() => {
    if (remainingSec !== 0) return;
    if (autoSubmitted || submitting || result || inconclusive || loading || !attemptToken) return;
    setAutoSubmitted(true);
    void onFinish(true);
  }, [remainingSec, autoSubmitted, submitting, result, inconclusive, loading, attemptToken]); // eslint-disable-line react-hooks/exhaustive-deps -- onFinish would loop

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
      const data = (await res.json()) as PlacementResult & {
        error?: string; status?: string; reason?: InconclusiveReason; required?: number;
        expiresAt?: number; serverNow?: number;
      };
      if (!res.ok) {
        if (data.error === "attempt_unavailable") {
          setInconclusive({ reason: "attempt_unavailable", required: minimumAnswers });
          return;
        }
        if (data.error === "attempt_incomplete") {
          if (typeof data.serverNow === "number" && typeof data.expiresAt === "number") {
            setClockOffsetMs(data.serverNow - Date.now());
            setExpiresAt(data.expiresAt);
            setRemainingSec(Math.max(0, Math.ceil((data.expiresAt - data.serverNow) / 1000)));
          }
          if (fromTimeout) setAutoSubmitted(false);
          setError(t("finishIncomplete"));
          return;
        }
        setError(t("finishError"));
        return;
      }
      if (data.status === "inconclusive") {
        setInconclusive({ reason: data.reason ?? "insufficient_evidence", required: data.required ?? minimumAnswers });
        return;
      }
      if (data.level) {
        setResult(data);
        void updateSession();
      } else {
        setError(t("finishError"));
      }
    } catch {
      setError(t("finishError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function selectOption(idx: number) {
    if (!q || submitting || autoSubmitted || remainingSec === 0) return;
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
        if (data.error === "attempt_unavailable") {
          setInconclusive({ reason: "attempt_unavailable", required: minimumAnswers });
          return;
        }
        if (data.error === "attempt_expired") {
          setAutoSubmitted(true);
          setRemainingSec(0);
          await onFinish(true);
          return;
        }
        setError(t("submitError"));
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
    } catch {
      setError(t("submitError"));
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
        {/* Progress bar */}
        <Skeleton height="3" width="full" rounded="full" />
        {/* Question — mirrors the real layout */}
        <div className="border-t border-border pt-6">
          <Skeleton height="3" width="2/3" />
          <div className="mt-3">
            <Skeleton height="8" width="3/4" />
          </div>
          <ul className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="rounded-xl border border-border px-4 py-3">
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
    return (
      <Outcome
        title={t("cooldownTitle")}
        description={t("cooldownBody", {
          date: formatPlacementEligibleDate(cooldownEligibleAt, locale),
        })}
        actions={
          <Link href="/dashboard" className={buttonClasses({ size: "lg" })}>
            {t("cooldownBack")}
          </Link>
        }
      />
    );
  }

  if (inconclusive) {
    const bodyKey = inconclusive.reason === "question_pool_exhausted" ? "poolExhaustedBody"
      : inconclusive.reason === "attempt_unavailable" ? "attemptUnavailableBody" : "inconclusiveBody";
    return (
      <div role="status">
        <Outcome
          title={t("inconclusiveTitle")}
          description={t(bodyKey, { count: inconclusive.required })}
          actions={<>
            <Button size="lg" onClick={() => void loadAttempt()}>{t("startAgain")}</Button>
            <Link href="/dashboard" className={buttonClasses({ variant: "secondary", size: "lg" })}>
              {t("backToDashboard")}
            </Link>
          </>}
        />
      </div>
    );
  }

  if (!question && !objectiveComplete) {
    return (
      <Outcome
        title={t("loadError")}
        actions={<Button size="lg" onClick={() => void loadAttempt()}>{t("startAgain")}</Button>}
      />
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
      /* The level is the answer the learner sat the test for, so it is the
         figure — not a line of body text inside a tinted success box. The
         previous panel said "result" in green above the thing that mattered. */
      <Outcome
        title={t("resultTitle")}
        figure={t(labelKey)}
        figureLabel={t("subLevelLabel", { subLevel: result.subLevel })}
        description={t("scoreSummary", { earned: result.earned, max: result.max })}
        actions={
          <Button size="lg" onClick={() => router.push("/dashboard")}>
            {t("backToDashboard")}
          </Button>
        }
      >
        {result.assessment?.completionReason === "timeout" && (
          <p className="mb-6 text-sm leading-relaxed text-muted" role="status">
            {t("timeoutResult", { answered: result.assessment.answered, total: result.assessment.total })}
          </p>
        )}
        <dl className="border-t border-border">
          {sectionOrder.map((sectionKey) => {
            const section = result.sectionScores[sectionKey];
            return (
              <div
                key={sectionKey}
                className="flex items-baseline justify-between gap-4 border-b border-border py-3"
              >
                <dt className="text-sm text-muted">{t(`section.${sectionKey}` as const)}</dt>
                <dd className="text-sm font-bold tabular-nums text-foreground">
                  {Math.round(section.ratio * 100)}%{" "}
                  <span className="font-medium text-muted">
                    ({section.earned}/{section.max})
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>

        {result.strengths.length > 0 && (
          <Section title={t("strengthsTitle")} size="sm" className="mt-6">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {result.strengths.map((key) => (
                <li key={key}>{t(`section.${key}` as const)}</li>
              ))}
            </ul>
          </Section>
        )}

        {result.improvements.length > 0 && (
          <Section title={t("improvementsTitle")} size="sm" className="mt-6">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {result.improvements.map((key) => (
                <li key={key}>{t(`section.${key}` as const)}</li>
              ))}
            </ul>
          </Section>
        )}

        {result.needsManualReview && (
          <p className="mt-6">
            <Status tone="warn">{t("manualReviewNotice")}</Status>
          </p>
        )}
      </Outcome>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm font-medium tabular-nums text-muted">
          {t("progress", { current: progressCurrent, total: progressTotal })}
        </p>
        {remainingSec !== null && (
          /* Under a minute the clock is the thing you are reacting to, so it
             stops being quiet. Time is not conveyed by colour alone — the
             label stays, and the figure simply gets heavier. */
          <p
            className={`text-sm tabular-nums ${
              remainingSec <= 60
                ? "font-bold text-[var(--app-danger)]"
                : "font-medium text-foreground"
            }`}
            aria-live={remainingSec <= 60 ? "polite" : "off"}
          >
            {t("timeRemaining")}: {Math.floor(remainingSec / 60)}:
            {String(remainingSec % 60).padStart(2, "0")}
          </p>
        )}
      </div>
      <ProgressBar
        percent={progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0}
        label={t("progress", { current: progressCurrent, total: progressTotal })}
        valueText={t("progress", { current: progressCurrent, total: progressTotal })}
        size="sm"
      />

      {!objectiveComplete && progressCurrent === 1 && (
        <p className="text-sm leading-relaxed text-muted">{t("minimumAnswersNotice", { count: minimumAnswers })}</p>
      )}

      {!objectiveComplete && q ? (
        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted">
            {placementTextToReact(isJa ? q.instructionJa : q.instructionEn)}
          </p>
          {/* Stimulus and answers stay English: this is an English test; JA locale only affects instructions. */}
          <p className="mt-3 text-[clamp(1.125rem,3vw,1.5rem)] font-bold leading-snug tracking-[-0.02em] text-foreground">
            {placementTextToReact(q.questionEn)}
          </p>
          <ChoiceList className="mt-6">
            {q.optionsEn.map((opt, idx) => (
              <Choice
                key={`${q.id}-${idx}`}
                disabled={submitting || autoSubmitted || remainingSec === 0}
                onSelect={() => void selectOption(idx)}
              >
                {placementTextToReact(opt)}
              </Choice>
            ))}
          </ChoiceList>
        </div>
      ) : (
        <Outcome
          title={t("objectiveComplete")}
          description={t("submitWhenReady")}
          actions={
            <Button
              size="lg"
              loading={submitting}
              disabled={remainingSec === 0}
              onClick={() => void onFinish(false)}
            >
              {t("submitPlacement")}
            </Button>
          }
        />
      )}
      {error && (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      )}
      {autoSubmitted && error && (
        <Button size="lg" loading={submitting} onClick={() => void onFinish(true)}>
          {t("retrySave")}
        </Button>
      )}
      {submitting && !objectiveComplete && (
        <p role="status">
          <Status tone="pending">{t("submitting")}</Status>
        </p>
      )}
    </div>
  );
}
