"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

function finalizeSlug(v: string): string {
  return v.replace(/^-+|-+$/g, "");
}

type School = {
  id: string;
  slug: string;
  name: string;
  nameJa?: string;
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

    const finalSlug = finalizeSlug(slug);
    if (!finalSlug) {
      setError(t("slugInvalidEmpty"));
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/org/${orgId}/schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: finalSlug }),
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
                onChange={(e) => setSlug(normalizeSlugInput(e.target.value))}
                onBlur={() => setSlug((s) => finalizeSlug(s))}
                placeholder={t("schoolSlugPlaceholder")}
                required
              />
              {slug.length > 0 && finalizeSlug(slug) !== slug && (
                <p className="mt-1 text-xs text-muted">
                  {t("slugPreview")}: <code className="text-foreground">{finalizeSlug(slug)}</code>
                </p>
              )}
              {slug.length > 0 && finalizeSlug(slug).length === 0 && (
                <p className="mt-1 text-xs text-[var(--app-danger)]">
                  {t("slugInvalidEmpty")}
                </p>
              )}
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
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-[var(--app-hover)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{school.name}</p>
                <p className="truncate text-xs text-muted">/{school.slug}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs font-medium text-muted">
                {t("memberCount", { count: school._count?.memberships ?? 0 })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
