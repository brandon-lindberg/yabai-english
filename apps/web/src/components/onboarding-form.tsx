"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

const GOALS = [
  { id: "conversation", labelKey: "goalConversation" },
  { id: "business", labelKey: "goalBusiness" },
  { id: "exam", labelKey: "goalExam" },
  { id: "travel", labelKey: "goalTravel" },
] as const;

const STEP_COUNT = 4;

type Props = {
  initialTimezone: string;
};

export function OnboardingForm({ initialTimezone }: Props) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [goals, setGoals] = useState<string[]>(["conversation"]);
  const [notifyLessonReminders, setNotifyLessonReminders] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedRecordingConsent, setAcceptedRecordingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canSubmit =
    acceptedTerms && acceptedPrivacy && acceptedRecordingConsent && goals.length > 0;
  const timezoneOptions = useMemo(() => {
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        return Intl.supportedValuesOf("timeZone");
      }
    } catch {
      // Fall through to minimal fallback list.
    }
    return [
      "Asia/Tokyo",
      "Asia/Seoul",
      "Asia/Singapore",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Los_Angeles",
      "Australia/Sydney",
      "UTC",
    ];
  }, []);

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;
    if (timezone !== "Asia/Tokyo" && timezone.length > 0) return;
    if (!timezoneOptions.includes(browserTz)) return;
    setTimezone(browserTz);
  }, [timezone, timezoneOptions]);

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  function canAdvanceFromStep(s: number): boolean {
    if (s === 0) return Boolean(timezone);
    if (s === 1) return goals.length > 0;
    if (s === 2) return true;
    return canSubmit;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          learningGoals: goals,
          notifyLessonReminders,
          notifyMessages,
          notifyPayments,
          acceptedTerms,
          acceptedPrivacy,
          acceptedRecordingConsent,
        }),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      router.push("/onboarding/next");
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">
          {t("wizardProgress", { current: step + 1, total: STEP_COUNT })}
        </p>
        <div
          className="h-1.5 max-w-[10rem] flex-1 overflow-hidden rounded-full bg-border"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <AppCard>
        {step === 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("timezoneLabel")}</h2>
            <p className="mt-1 text-xs text-muted">{t("timezoneHelp")}</p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              required
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">{t("goalsLabel")}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {GOALS.map((goal) => (
                <label
                  key={goal.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={goals.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                  />
                  {t(goal.labelKey)}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              {t("notificationsLabel")}
            </legend>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyLessonReminders}
                  onChange={(e) => setNotifyLessonReminders(e.target.checked)}
                />
                {t("notifyLessons")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyMessages}
                  onChange={(e) => setNotifyMessages(e.target.checked)}
                />
                {t("notifyMessages")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyPayments}
                  onChange={(e) => setNotifyPayments(e.target.checked)}
                />
                {t("notifyPayments")}
              </label>
            </div>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">{t("consentLabel")}</legend>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="text-sm leading-relaxed">
                  {t.rich("acceptTerms", {
                    terms: (chunks) => (
                      <Link
                        href="/legal/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-link underline-offset-4 hover:underline"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                />
                <span className="text-sm leading-relaxed">
                  {t.rich("acceptPrivacy", {
                    privacy: (chunks) => (
                      <Link
                        href="/legal/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-link underline-offset-4 hover:underline"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedRecordingConsent}
                  onChange={(e) => setAcceptedRecordingConsent(e.target.checked)}
                />
                <span className="text-sm leading-relaxed">{t("acceptRecording")}</span>
              </label>
            </div>
          </fieldset>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm" style={{ color: "var(--app-danger)" }}>
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {t("wizardBack")}
          </button>
          {step < STEP_COUNT - 1 ? (
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canAdvanceFromStep(step)}
              onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
            >
              {t("wizardNext")}
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "…" : t("submit")}
            </button>
          )}
        </div>
      </AppCard>
    </form>
  );
}
