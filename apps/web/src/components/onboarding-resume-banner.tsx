import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingSkipButton } from "@/components/onboarding-skip-button";

export async function OnboardingResumeBanner({
  href,
  step,
}: {
  href: string | null;
  step?: string | null;
}) {
  if (!href) return null;
  const t = await getTranslations("onboarding");
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        {t("resumeHint")}{" "}
        <Link
          href={href as "/onboarding/next"}
          className="font-semibold text-link hover:opacity-90"
        >
          {t("resumeCta")}
        </Link>
      </p>
      {step ? (
        <div className="flex flex-wrap items-center gap-2">
          <OnboardingSkipButton
            step={step}
            returnHref={href}
            variant="primary"
            labelKey="markStepDone"
            testIdSuffix="done"
          />
          <OnboardingSkipButton
            step={step}
            returnHref={href}
            variant="ghost"
            labelKey="skipThisStep"
          />
        </div>
      ) : null}
    </div>
  );
}
