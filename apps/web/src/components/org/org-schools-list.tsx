"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

type School = {
  id: string;
  slug: string;
  name: string;
  nameJa?: string;
  applicationFlowEnabled: boolean;
  selfEnrollmentEnabled: boolean;
  _count?: { memberships: number };
};

type Props = { orgId: string };

export function OrgSchoolsList({ orgId }: Props) {
  const t = useTranslations("org.schoolsPage");
  const [schools, setSchools] = useState<School[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools`)
      .then((r) => r.json())
      .then((d) => setSchools(d.schools ?? []));
  }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/org/${orgId}/schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    if (!res.ok) {
      setError(t("error"));
      setSaving(false);
      return;
    }

    const { school } = await res.json();
    setSchools((prev) => [...prev, school]);
    setShowCreate(false);
    setName("");
    setSlug("");
    setSaving(false);
  }

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("addSchool")}
        </button>
      </div>

      {showCreate && (
        <AppCard className="mb-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t("createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("schoolName")}
              </label>
              <input
                className={inputCn}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("schoolNamePlaceholder")}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("schoolSlug")}
              </label>
              <input
                className={inputCn}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={t("schoolSlugPlaceholder")}
                required
              />
            </div>
            {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t("creating") : t("create")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </AppCard>
      )}

      {schools.length === 0 ? (
        <p className="text-sm text-muted">{t("noSchools")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/org/${orgId}/schools/${school.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--app-hover)]"
            >
              <div>
                <p className="font-medium text-foreground">{school.name}</p>
                <p className="text-xs text-muted">/{school.slug}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>
                  {t("applicationFlow")}:{" "}
                  {school.applicationFlowEnabled ? t("enabled") : t("disabled")}
                </span>
                <span>
                  {t("selfEnrollment")}:{" "}
                  {school.selfEnrollmentEnabled ? t("enabled") : t("disabled")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
