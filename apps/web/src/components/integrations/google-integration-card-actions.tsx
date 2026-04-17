"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  feature: "calendar" | "drive" | "meet";
  connected: boolean;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export function buildConnectHref(
  feature: Props["feature"],
  onboardingNext?: string | null,
  onboardingStep?: string | null,
): string {
  const basePath = "/dashboard/integrations";
  const returnParams = new URLSearchParams();
  if (onboardingNext) {
    returnParams.set("onboardingNext", onboardingNext);
  }
  if (onboardingStep) {
    returnParams.set("onboardingStep", onboardingStep);
  }
  const qs = returnParams.toString();
  const returnTo = qs ? `${basePath}?${qs}` : basePath;
  return `/api/integrations/google/connect?feature=${feature}&returnTo=${encodeURIComponent(returnTo)}`;
}

export function GoogleIntegrationCardActions({
  feature,
  connected,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    await fetch("/api/integrations/google/disconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feature }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2">
      <a
        href={buildConnectHref(feature, onboardingNext, onboardingStep)}
        className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {connected ? "Reconnect" : "Connect"}
      </a>
      {connected ? (
        <button
          type="button"
          disabled={busy}
          onClick={disconnect}
          className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-60"
        >
          Disconnect
        </button>
      ) : null}
    </div>
  );
}
