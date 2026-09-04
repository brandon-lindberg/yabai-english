"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { useOnboardingSubmit } from "@/hooks/use-onboarding-submit";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { buttonClasses } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Field, Select } from "@/components/ui/field";
import { inlineLinkClass } from "@/components/ui/inline-link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Status } from "@/components/ui/status";

const GOALS = [
  { id: "conversation", labelKey: "goalConversation" },
  { id: "business", labelKey: "goalBusiness" },
  { id: "exam", labelKey: "goalExam" },
  { id: "travel", labelKey: "goalTravel" },
] as const;

const STEP_COUNT = 4;

/** Four steps, one shape: a legend, then the controls under it. */
function WizardStep({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-foreground">{legend}</legend>
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

type Props = {
  initialTimezone: string;
};

/**
 * The one wizard in onboarding, and the only part of it that is genuinely a
 * wizard: it collects preferences that must be answered in order and saved
 * together. Everything after it is a checklist, which is a different shape and
 * lives in `OnboardingChecklist`.
 *
 * Teachers have no counterpart to this — they consent through the payment
 * policy step instead — so there is nothing here to share across flows.
 */
/**
 * Everything the wizard has been told so far.
 *
 * One object rather than nine `useState`s because it is saved and restored as
 * a unit: switching language remounts this form, and a half-restored draft —
 * the step without the answers — would put someone on the terms page with
 * their goals silently back at the defaults.
 */
type WizardDraft = {
  step: number;
  chosenTimezone: string | null;
  goals: string[];
  notifyLessonReminders: boolean;
  notifyMessages: boolean;
  notifyPayments: boolean;
};

const EMPTY_DRAFT: WizardDraft = {
  step: 0,
  chosenTimezone: null,
  goals: ["conversation"],
  notifyLessonReminders: true,
  notifyMessages: true,
  notifyPayments: true,
};

export function OnboardingForm({ initialTimezone }: Props) {
  const t = useTranslations("onboarding");
  const [draft, setDraft, clearDraft] = useSessionDraft<WizardDraft>(
    "onboarding-wizard",
    EMPTY_DRAFT,
  );
  const { step, chosenTimezone, goals, notifyLessonReminders, notifyMessages, notifyPayments } =
    draft;
  /*
    Consent is deliberately outside the draft, and so is never restored.
    Agreeing to the terms is an act performed on this page; a draft that could
    assert it on the student's behalf would turn a stale storage entry into a
    record of consent nobody gave.
  */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedRecordingConsent, setAcceptedRecordingConsent] = useState(false);
  const patch = (changes: Partial<WizardDraft>) => setDraft({ ...draft, ...changes });
  const setStep = (next: number) => patch({ step: next });
  const setChosenTimezone = (next: string) => patch({ chosenTimezone: next });
  const { saving, error, submit } = useOnboardingSubmit();
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

  /*
    Detection only fills the gap the stored value leaves; an explicit pick always
    wins. This used to be an effect keyed on the current timezone, which meant a
    student who deliberately chose Asia/Tokyo — the stored default, and the one
    value the condition treated as "unset" — had their choice overwritten with
    whatever their browser reported.
  */
  const browserTimezone = useBrowserTimezone();
  const detectedTimezone =
    initialTimezone === "Asia/Tokyo" || initialTimezone.length === 0
      ? browserTimezone && timezoneOptions.includes(browserTimezone)
        ? browserTimezone
        : initialTimezone
      : initialTimezone;
  const timezone = chosenTimezone ?? detectedTimezone;

  function toggleGoal(goal: string) {
    patch({
      goals: goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal],
    });
  }

  function canAdvanceFromStep(s: number): boolean {
    if (s === 0) return Boolean(timezone);
    if (s === 1) return goals.length > 0;
    if (s === 2) return true;
    return canSubmit;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const saved = await submit("/api/onboarding", {
      destination: "/onboarding/next",
      init: {
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
      },
    });
    // Only once it is on the server. A failed save leaves the draft in place,
    // so a retry does not start from an empty form.
    if (saved) clearDraft();
  }

  const progressLabel = t("wizardProgress", { current: step + 1, total: STEP_COUNT });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Was a hand-built bar marked `aria-hidden`, so the only progress signal a
          screen reader got was the text beside it. This is the same bar the
          checklist, study and placement use. */}
      <div className="flex items-center gap-3">
        <ProgressBar
          percent={((step + 1) / STEP_COUNT) * 100}
          label={progressLabel}
          valueText={progressLabel}
          size="sm"
          className="flex-1"
        />
        <p className="text-xs font-medium tabular-nums text-muted">{progressLabel}</p>
      </div>

      {step === 0 ? (
        <WizardStep legend={t("timezoneLabel")}>
          {/* The legend already names the group, so the select's own label is
              carried for screen readers only. */}
          <Field label={t("timezoneLabel")} hideLabel hint={t("timezoneHelp")}>
            {(field) => (
              <Select
                {...field}
                value={timezone}
                onChange={(e) => setChosenTimezone(e.target.value)}
                required
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </WizardStep>
      ) : null}

      {step === 1 ? (
        <WizardStep legend={t("goalsLabel")}>
          {/* The same option row the quiz and flashcards use, as a multi-select. */}
          <ChoiceList columns={2}>
            {GOALS.map((goal) => (
              <Choice
                key={goal.id}
                toggle
                state={goals.includes(goal.id) ? "selected" : "idle"}
                onSelect={() => toggleGoal(goal.id)}
              >
                {t(goal.labelKey)}
              </Choice>
            ))}
          </ChoiceList>
        </WizardStep>
      ) : null}

      {step === 2 ? (
        <WizardStep legend={t("notificationsLabel")}>
          <div className="divide-y divide-border border-y border-border">
            <CheckRow checked={notifyLessonReminders} onChange={(v) => patch({ notifyLessonReminders: v })}>
              {t("notifyLessons")}
            </CheckRow>
            <CheckRow checked={notifyMessages} onChange={(v) => patch({ notifyMessages: v })}>
              {t("notifyMessages")}
            </CheckRow>
            <CheckRow checked={notifyPayments} onChange={(v) => patch({ notifyPayments: v })}>
              {t("notifyPayments")}
            </CheckRow>
          </div>
        </WizardStep>
      ) : null}

      {step === 3 ? (
        <WizardStep legend={t("consentLabel")}>
          <div className="divide-y divide-border border-y border-border">
            <CheckRow checked={acceptedTerms} onChange={setAcceptedTerms}>
              {t.rich("acceptTerms", {
                terms: (chunks) => (
                  <Link
                    href="/legal/terms/students"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={inlineLinkClass}
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </CheckRow>
            <CheckRow checked={acceptedPrivacy} onChange={setAcceptedPrivacy}>
              {t.rich("acceptPrivacy", {
                privacy: (chunks) => (
                  <Link
                    href="/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={inlineLinkClass}
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </CheckRow>
            {/* Consent asked for without saying what it is for is consent in
                name only, and this is the one item here a student cannot infer
                from its label. */}
            <CheckRow
              checked={acceptedRecordingConsent}
              onChange={setAcceptedRecordingConsent}
              description={t("acceptRecordingExplainer")}
            >
              {t("acceptRecording")}
            </CheckRow>
          </div>
        </WizardStep>
      ) : null}

      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <button
          type="button"
          className={buttonClasses({ variant: "secondary" })}
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
        >
          {t("wizardBack")}
        </button>
        {step < STEP_COUNT - 1 ? (
          <button
            type="button"
            className={buttonClasses({ size: "lg" })}
            disabled={!canAdvanceFromStep(step)}
            onClick={() => setStep(Math.min(STEP_COUNT - 1, step + 1))}
          >
            {t("wizardNext")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className={buttonClasses({ size: "lg" })}
          >
            {saving ? "…" : t("submit")}
          </button>
        )}
      </div>
    </form>
  );
}
