"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";
import { Button, buttonClasses } from "@/components/ui/button";

export function buildConnectHref(
  onboardingNext?: string | null,
  onboardingStep?: string | null,
): string {
  const basePath = DASHBOARD_GOOGLE_SETTINGS_PATH;
  const returnParams = new URLSearchParams();
  if (onboardingNext) {
    returnParams.set("onboardingNext", onboardingNext);
  }
  if (onboardingStep) {
    returnParams.set("onboardingStep", onboardingStep);
  }
  const qs = returnParams.toString();
  const returnTo = qs ? `${basePath}?${qs}` : basePath;
  return `/api/integrations/google/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

export function GoogleIntegrationCardActions({
  connected,
  onboardingNext = null,
  onboardingStep = null,
}: {
  connected: boolean;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.integrationsPage");
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <a
        href={buildConnectHref(onboardingNext, onboardingStep)}
        className={buttonClasses({
          size: "sm",
          /*
            Reconnecting stays secondary even on a partial grant.

            A missing permission is not necessarily a mistake to correct: the
            user may have declined it deliberately on Google's consent screen.
            Google's OAuth policy is explicit that a declined scope should only
            be re-requested once the user shows intent to use that feature, so
            the control is offered and never urged.
          */
          variant: connected ? "secondary" : "primary",
        })}
      >
        {connected ? t("reconnect") : t("connect")}
      </a>
      {connected ? (
        <Button variant="secondary" size="sm" loading={busy} onClick={() => void disconnect()}>
          {t("disconnect")}
        </Button>
      ) : null}
    </>
  );
}
