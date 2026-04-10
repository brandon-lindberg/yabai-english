"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const GOALS = [
  { id: "conversation", labelKey: "goalConversation" },
  { id: "business", labelKey: "goalBusiness" },
  { id: "exam", labelKey: "goalExam" },
  { id: "kids", labelKey: "goalKids" },
] as const;

type Props = {
  initialTimezone: string;
};

export function OnboardingForm({ initialTimezone }: Props) {
  const t = useTranslations("onboarding");
  const router = useRouter();
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

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
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
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("timezoneLabel")}</h2>
        <input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Asia/Tokyo"
          required
        />
      </div>

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

      <fieldset>
        <legend className="text-lg font-semibold text-foreground">{t("notificationsLabel")}</legend>
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

      <fieldset>
        <legend className="text-lg font-semibold text-foreground">{t("consentLabel")}</legend>
        <div className="mt-3 space-y-2 text-sm text-foreground">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            {t("acceptTerms")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            />
            {t("acceptPrivacy")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={acceptedRecordingConsent}
              onChange={(e) => setAcceptedRecordingConsent(e.target.checked)}
            />
            {t("acceptRecording")}
          </label>
        </div>
      </fieldset>

      {error && (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "…" : t("submit")}
      </button>
    </form>
  );
}
