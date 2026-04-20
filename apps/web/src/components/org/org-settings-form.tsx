"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type OrgData = {
  name: string;
  nameJa?: string;
  nameEn?: string;
  timezone?: string;
  description?: string;
  descriptionJa?: string;
  billingTarget: string;
  allowTeacherMarketplace: boolean;
};

type Props = { orgId: string };

export function OrgSettingsForm({ orgId }: Props) {
  const t = useTranslations("org.settingsPage");
  const [data, setData] = useState<OrgData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`/api/org/${orgId}`)
      .then((r) => r.json())
      .then((d) => setData(d.organization));
  }, [orgId]);

  if (!data) return null;

  function update(field: string, value: string | boolean) {
    setData((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const res = await fetch(`/api/org/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data!.name,
        nameJa: data!.nameJa || undefined,
        nameEn: data!.nameEn || undefined,
        timezone: data!.timezone || undefined,
        description: data!.description || undefined,
        descriptionJa: data!.descriptionJa || undefined,
        billingTarget: data!.billingTarget,
        allowTeacherMarketplace: data!.allowTeacherMarketplace,
      }),
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
            {t("orgName")}
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
              {t("orgNameJa")}
            </label>
            <input
              className={inputCn}
              value={data.nameJa ?? ""}
              onChange={(e) => update("nameJa", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t("orgNameEn")}
            </label>
            <input
              className={inputCn}
              value={data.nameEn ?? ""}
              onChange={(e) => update("nameEn", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("timezone")}
          </label>
          <input
            className={inputCn}
            value={data.timezone ?? ""}
            onChange={(e) => update("timezone", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("description_field")}
          </label>
          <textarea
            className={inputCn}
            rows={3}
            value={data.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("billingTarget")}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="billingTarget"
                value="ORGANIZATION"
                checked={data.billingTarget === "ORGANIZATION"}
                onChange={() => update("billingTarget", "ORGANIZATION")}
              />
              {t("billingOrg")}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="billingTarget"
                value="STUDENT"
                checked={data.billingTarget === "STUDENT"}
                onChange={() => update("billingTarget", "STUDENT")}
              />
              {t("billingStudent")}
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={data.allowTeacherMarketplace}
              onChange={(e) => update("allowTeacherMarketplace", e.target.checked)}
            />
            {t("allowTeacherMarketplace")}
          </label>
          <p className="mt-1 text-xs text-muted">{t("allowTeacherMarketplaceHelp")}</p>
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
