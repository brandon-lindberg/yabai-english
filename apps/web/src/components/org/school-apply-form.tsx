"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

type Props = { orgId: string; schoolId: string };

export function SchoolApplyForm({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.applyPage");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/org/${orgId}/schools/${schoolId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNote: note || undefined }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? t("error"));
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
    router.refresh();
  }

  if (submitted) {
    return (
      <AppCard>
        <p className="text-sm text-foreground">{t("submitted")}</p>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t("noteLabel")}
          </label>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-muted">{t("noteHelp")}</p>
        </div>
        {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("submitting") : t("submit")}
        </button>
      </form>
    </AppCard>
  );
}
