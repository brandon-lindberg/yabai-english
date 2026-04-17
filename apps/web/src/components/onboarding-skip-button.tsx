"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Variant = "primary" | "ghost";

/**
 * What the button should do on click:
 *  - "complete": POST /api/onboarding/skip-step (marks the step as done) then redirect.
 *  - "skip":     just redirect to `returnHref` without changing onboarding state.
 */
type Action = "complete" | "skip";

type Props = {
  step: string;
  returnHref: string;
  variant?: Variant;
  /** One of the translation keys under `onboarding.*`. */
  labelKey?: "skipThisStep" | "markStepDone";
  /** Defaults to "complete" for backward compatibility. */
  action?: Action;
  className?: string;
  testIdSuffix?: string;
};

const VARIANT_CLASSNAMES: Record<Variant, string> = {
  primary:
    "inline-flex whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60",
  ghost:
    "inline-flex whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-60",
};

export function OnboardingSkipButton({
  step,
  returnHref,
  variant = "ghost",
  labelKey = "skipThisStep",
  action = "complete",
  className,
  testIdSuffix,
}: Props) {
  const t = useTranslations("onboarding");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (action === "skip") {
      window.location.href = returnHref;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/skip-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) {
        setError(t("saveError"));
        setBusy(false);
        return;
      }
      window.location.href = returnHref;
    } catch {
      setError(t("saveError"));
      setBusy(false);
    }
  }

  const testId = testIdSuffix
    ? `onboarding-${testIdSuffix}-${step}`
    : `onboarding-skip-${step}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid={testId}
      data-error={error ? "true" : undefined}
      title={error ?? undefined}
      className={className ?? VARIANT_CLASSNAMES[variant]}
    >
      {busy ? "…" : t(labelKey)}
    </button>
  );
}
