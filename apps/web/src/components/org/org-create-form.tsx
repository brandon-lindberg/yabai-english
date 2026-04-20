"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

export function OrgCreateForm() {
  const t = useTranslations("org.createPage");
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, schoolName, schoolSlug, timezone }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    const { organization } = await res.json();

    // Set active org cookie
    await fetch("/api/user/active-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: organization.id }),
    });

    router.push(`/org/${organization.id}`);
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("orgNamePlaceholder")}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orgSlug")}
          </label>
          <input
            className={inputCn}
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={t("orgSlugPlaceholder")}
            required
          />
          <p className="mt-1 text-xs text-muted">{t("orgSlugHelp")}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("schoolName")}
          </label>
          <input
            className={inputCn}
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder={t("schoolNamePlaceholder")}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("schoolSlug")}
          </label>
          <input
            className={inputCn}
            value={schoolSlug}
            onChange={(e) => setSchoolSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={t("schoolSlugPlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("timezone")}
          </label>
          <input className={inputCn} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>

        {status === "error" && (
          <p className="text-sm text-[var(--app-danger)]">{t("error")}</p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("creating") : t("submit")}
        </button>
      </form>
    </AppCard>
  );
}
