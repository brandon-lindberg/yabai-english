"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Status } from "@/components/ui/status";
import { buttonClasses } from "@/components/ui/button";

/**
 * Calls off a whole group class.
 *
 * Shaped like `BookingCancelButton` rather than `ConfirmDelete` on purpose:
 * this sits on every row of a list, and that component's own note explains why
 * a destructive hue repeated down a page stops reading as a warning. The guard
 * here is the sentence, not the styling — it says how many students are about
 * to be refunded, which is the fact that should give a teacher pause.
 */
export function GroupClassCancelButton({
  sessionId,
  seatedCount,
}: {
  sessionId: string;
  seatedCount: number;
}) {
  const t = useTranslations("dashboard.schedulePage");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    if (!window.confirm(t("groupClassCancelConfirm", { count: seatedCount }))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-lesson-sessions/${sessionId}/cancel`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("groupClassCancelError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("groupClassCancelError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        {loading ? t("groupClassCancelWorking") : t("groupClassCancel")}
      </button>
    </div>
  );
}
