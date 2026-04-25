"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type TaxonomyItem = {
  id: string;
  code: string;
  label: string;
  labelJa: string | null;
  labelEn: string | null;
  sortOrder: number;
  active: boolean;
};

type Props = { orgId: string; schoolId: string };

type DraftForm = {
  code: string;
  label: string;
  labelJa: string;
  labelEn: string;
  sortOrder: number;
};

const emptyDraft: DraftForm = {
  code: "",
  label: "",
  labelJa: "",
  labelEn: "",
  sortOrder: 0,
};

const inputCn =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

export function SchoolTaxonomyManager({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.taxonomyPage");
  const [levels, setLevels] = useState<TaxonomyItem[]>([]);
  const [types, setTypes] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/org/${orgId}/schools/${schoolId}/class-levels`).then((r) =>
        r.json(),
      ),
      fetch(`/api/org/${orgId}/schools/${schoolId}/class-types`).then((r) =>
        r.json(),
      ),
    ])
      .then(([lvl, typ]) => {
        if (!alive) return;
        setLevels(lvl.classLevels ?? []);
        setTypes(typ.classTypes ?? []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId, schoolId]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t("description")}</p>

      <TaxonomySection
        title={t("classLevelsTitle")}
        addLabel={t("addLevel")}
        emptyLabel={t("noLevels")}
        items={levels}
        endpoint={`/api/org/${orgId}/schools/${schoolId}/class-levels`}
        onCreated={(item) => setLevels((prev) => [...prev, item])}
        onRemoved={(id) => setLevels((prev) => prev.filter((i) => i.id !== id))}
        loading={loading}
      />

      <TaxonomySection
        title={t("classTypesTitle")}
        addLabel={t("addType")}
        emptyLabel={t("noTypes")}
        items={types}
        endpoint={`/api/org/${orgId}/schools/${schoolId}/class-types`}
        responseKey="classType"
        onCreated={(item) => setTypes((prev) => [...prev, item])}
        onRemoved={(id) => setTypes((prev) => prev.filter((i) => i.id !== id))}
        loading={loading}
      />
    </div>
  );
}

type SectionProps = {
  title: string;
  addLabel: string;
  emptyLabel: string;
  items: TaxonomyItem[];
  endpoint: string;
  responseKey?: "classLevel" | "classType";
  onCreated: (item: TaxonomyItem) => void;
  onRemoved: (id: string) => void;
  loading: boolean;
};

function TaxonomySection({
  title,
  addLabel,
  emptyLabel,
  items,
  endpoint,
  responseKey = "classLevel",
  onCreated,
  onRemoved,
  loading,
}: SectionProps) {
  const t = useTranslations("org.school.taxonomyPage");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const codeId = useId();
  const labelId = useId();
  const labelJaId = useId();
  const labelEnId = useId();
  const sortId = useId();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: draft.code,
        label: draft.label,
        labelJa: draft.labelJa || null,
        labelEn: draft.labelEn || null,
        sortOrder: draft.sortOrder,
      }),
    });
    if (!res.ok) {
      setError(t("error"));
      setSaving(false);
      return;
    }
    const json = await res.json();
    const item = (json[responseKey] ?? json.item) as TaxonomyItem;
    onCreated(item);
    setDraft(emptyDraft);
    setShowAdd(false);
    setSaving(false);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (res.ok) onRemoved(id);
  }

  return (
    <AppCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {addLabel}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={codeId} className="mb-1 block text-sm font-medium text-foreground">
                {t("code")}
              </label>
              <input
                id={codeId}
                className={inputCn}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder={t("codePlaceholder")}
                required
              />
            </div>
            <div>
              <label htmlFor={labelId} className="mb-1 block text-sm font-medium text-foreground">
                {t("label")}
              </label>
              <input
                id={labelId}
                className={inputCn}
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder={t("labelPlaceholder")}
                required
              />
            </div>
            <div>
              <label htmlFor={labelJaId} className="mb-1 block text-sm font-medium text-foreground">
                {t("labelJa")}
              </label>
              <input
                id={labelJaId}
                className={inputCn}
                value={draft.labelJa}
                onChange={(e) => setDraft({ ...draft, labelJa: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={labelEnId} className="mb-1 block text-sm font-medium text-foreground">
                {t("labelEn")}
              </label>
              <input
                id={labelEnId}
                className={inputCn}
                value={draft.labelEn}
                onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={sortId} className="mb-1 block text-sm font-medium text-foreground">
                {t("sortOrder")}
              </label>
              <input
                id={sortId}
                type="number"
                className={inputCn}
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value) })
                }
              />
            </div>
          </div>
          {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setDraft(emptyDraft);
                setError("");
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted">{item.code}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}
