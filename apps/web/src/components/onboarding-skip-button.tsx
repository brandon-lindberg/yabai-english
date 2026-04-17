"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Variant = "primary" | "ghost";

type Props = {
  step: string;
  returnHref: string;
  variant?: Variant;
  /** One of the translation keys under `onboarding.*`. Defaults to "skipThisStep". */
  labelKey?: "skipThisStep" | "markStepDone";
  className?: string;
  testIdSuffix?: string;
};

const VARIANT_CLASSNAMES: Record<Variant, string> = {
  primary:
    "inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60",
  ghost:
    "inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-60",
};

export function OnboardingSkipButton({
  step,
  returnHref,
  variant = "ghost",
  labelKey = "skipThisStep",
  className,
  testIdSuffix,
}: Props) {
  const t = useTranslations("onboarding");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
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
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        data-testid={testId}
        className={className ?? VARIANT_CLASSNAMES[variant]}
      >
        {busy ? "…" : t(labelKey)}
      </button>
      {error ? (
        <p className="text-xs" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
