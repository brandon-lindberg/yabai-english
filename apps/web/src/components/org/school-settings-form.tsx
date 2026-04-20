"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type SchoolData = {
  name: string;
  nameJa?: string;
  nameEn?: string;
  applicationFlowEnabled: boolean;
  selfEnrollmentEnabled: boolean;
};

type Props = { orgId: string; schoolId: string };

export function SchoolSettingsForm({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.settingsPage");
  const [data, setData] = useState<SchoolData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}`)
      .then((r) => r.json())
      .then((d) => setData(d.school));
  }, [orgId, schoolId]);

  if (!data) return null;

  function update(field: string, value: string | boolean) {
    setData((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const res = await fetch(`/api/org/${orgId}/schools/${schoolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  return (
    <AppCard>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("schoolName")}
          </label>
          <input
            className={inputCn}
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t("nameJa")}
            </label>
            <input
              className={inputCn}
              value={data.nameJa ?? ""}
              onChange={(e) => update("nameJa", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t("nameEn")}
            </label>
            <input
              className={inputCn}
              value={data.nameEn ?? ""}
              onChange={(e) => update("nameEn", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={data.applicationFlowEnabled}
                onChange={(e) => update("applicationFlowEnabled", e.target.checked)}
              />
              {t("applicationFlowEnabled")}
            </label>
            <p className="ml-6 text-xs text-muted">{t("applicationFlowHelp")}</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={data.selfEnrollmentEnabled}
                onChange={(e) => update("selfEnrollmentEnabled", e.target.checked)}
              />
              {t("selfEnrollmentEnabled")}
            </label>
            <p className="ml-6 text-xs text-muted">{t("selfEnrollmentHelp")}</p>
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-[var(--app-danger)]">{t("error")}</p>
        )}
        {status === "saved" && (
          <p className="text-sm text-muted">{t("saved")}</p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
      </form>
    </AppCard>
  );
}
