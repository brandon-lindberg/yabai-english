"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

type Props = {
  token: string;
  orgName: string;
  schoolName: string | null;
  orgRole: string;
  orgId: string;
};

export function OrgInviteAccept({
  token,
  orgName,
  schoolName,
  orgRole,
  orgId,
}: Props) {
  const t = useTranslations("org.invitePage");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/org/invite/${token}`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? t("error"));
      setSaving(false);
      return;
    }
    router.push(`/org/${orgId}` as "/org/[orgId]");
    router.refresh();
  }

  return (
    <AppCard>
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          {t("invitedAs", { role: orgRole })}
        </p>
        <p className="text-sm text-foreground">
          <span className="font-medium">{orgName}</span>
          {schoolName && <span className="text-muted"> · {schoolName}</span>}
        </p>
        {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={saving}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("accepting") : t("accept")}
          </button>
        </div>
      </div>
    </AppCard>
  );
}
