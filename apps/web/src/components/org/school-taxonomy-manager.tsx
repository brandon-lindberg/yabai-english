"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
};

const emptyDraft: DraftForm = {
  code: "",
  label: "",
  labelJa: "",
  labelEn: "",
};

const inputCn =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

type SortKey = "sortOrder" | "code" | "label";
type SortDir = "asc" | "desc";

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
      <TaxonomySection
        title={t("classLevelsTitle")}
        addLabel={t("addLevel")}
        emptyLabel={t("noLevels")}
        codePlaceholder={t("levelCodePlaceholder")}
        labelPlaceholder={t("levelLabelPlaceholder")}
        items={levels}
        endpoint={`/api/org/${orgId}/schools/${schoolId}/class-levels`}
        rowTestIdPrefix="taxonomy-row-label-lvl"
        onCreated={(item) => setLevels((prev) => [...prev, item])}
        onRemoved={(id) => setLevels((prev) => prev.filter((i) => i.id !== id))}
        onReorder={(next) => setLevels(next)}
        loading={loading}
      />

      <TaxonomySection
        title={t("classTypesTitle")}
        addLabel={t("addType")}
        emptyLabel={t("noTypes")}
        codePlaceholder={t("typeCodePlaceholder")}
        labelPlaceholder={t("typeLabelPlaceholder")}
        items={types}
        endpoint={`/api/org/${orgId}/schools/${schoolId}/class-types`}
        responseKey="classType"
        rowTestIdPrefix="taxonomy-row-label-typ"
        onCreated={(item) => setTypes((prev) => [...prev, item])}
        onRemoved={(id) => setTypes((prev) => prev.filter((i) => i.id !== id))}
        onReorder={(next) => setTypes(next)}
        loading={loading}
      />

      <CombinationsPreview
        levels={levels}
        types={types}
        loading={loading}
      />
    </div>
  );
}

function CombinationsPreview({
  levels,
  types,
  loading,
}: {
  levels: TaxonomyItem[];
  types: TaxonomyItem[];
  loading: boolean;
}) {
  const t = useTranslations("org.school.taxonomyPage");
  if (loading) return null;

  const sortedLevels = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedTypes = [...types].sort((a, b) => a.sortOrder - b.sortOrder);
  const empty = sortedLevels.length === 0 || sortedTypes.length === 0;

  return (
    <AppCard>
      <h2 className="mb-1 text-base font-semibold text-foreground">
        {t("combinationsTitle")}
      </h2>
      <p className="mb-4 text-sm text-muted">{t("combinationsHelp")}</p>
      {empty ? (
        <p className="text-sm text-muted">{t("combinationsEmpty")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sortedLevels.flatMap((lvl) =>
            sortedTypes.map((typ) => (
              <span
                key={`${lvl.id}-${typ.id}`}
                data-testid={`taxonomy-combo-${lvl.id}-${typ.id}`}
                className="rounded-full border border-border bg-[var(--app-hover)] px-3 py-1 text-xs text-foreground"
              >
                {lvl.label} · {typ.label}
              </span>
            )),
          )}
        </div>
      )}
    </AppCard>
  );
}

type SectionProps = {
  title: string;
  addLabel: string;
  emptyLabel: string;
  codePlaceholder: string;
  labelPlaceholder: string;
  items: TaxonomyItem[];
  endpoint: string;
  responseKey?: "classLevel" | "classType";
  rowTestIdPrefix: string;
  onCreated: (item: TaxonomyItem) => void;
  onRemoved: (id: string) => void;
  onReorder: (next: TaxonomyItem[]) => void;
  loading: boolean;
};

function TaxonomySection({
  title,
  addLabel,
  emptyLabel,
  codePlaceholder,
  labelPlaceholder,
  items,
  endpoint,
  responseKey = "classLevel",
  rowTestIdPrefix,
  onCreated,
  onRemoved,
  onReorder,
  loading,
}: SectionProps) {
  const t = useTranslations("org.school.taxonomyPage");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const codeId = useId();
  const labelId = useId();
  const labelJaId = useId();
  const labelEnId = useId();

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
      }),
    });
    if (!res.ok) {
      setError(res.status === 409 ? t("duplicateCode") : t("error"));
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

  async function handleMove(id: string, direction: -1 | 1) {
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = ordered.findIndex((i) => i.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[swapIdx];
    const aSort = a.sortOrder;
    const bSort = b.sortOrder;

    const next = items.map((it) => {
      if (it.id === a.id) return { ...it, sortOrder: bSort };
      if (it.id === b.id) return { ...it, sortOrder: aSort };
      return it;
    });
    onReorder(next);

    await Promise.all([
      fetch(`${endpoint}/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: bSort }),
      }),
      fetch(`${endpoint}/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: aSort }),
      }),
    ]);
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
                placeholder={codePlaceholder}
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
                placeholder={labelPlaceholder}
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
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--app-hover)] text-left">
                <SortHeader
                  label={t("orderColumn")}
                  active={sortKey === "sortOrder"}
                  dir={sortDir}
                  onClick={() => toggleSort("sortOrder")}
                />
                <SortHeader
                  label={t("codeColumn")}
                  active={sortKey === "code"}
                  dir={sortDir}
                  onClick={() => toggleSort("code")}
                />
                <SortHeader
                  label={t("labelColumn")}
                  active={sortKey === "label"}
                  dir={sortDir}
                  onClick={() => toggleSort("label")}
                />
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("actionsColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, visibleIdx) => {
                const orderedByPosition = [...items].sort(
                  (a, b) => a.sortOrder - b.sortOrder,
                );
                const positionIdx = orderedByPosition.findIndex(
                  (i) => i.id === item.id,
                );
                const isFirst = positionIdx === 0;
                const isLast = positionIdx === orderedByPosition.length - 1;
                return (
                  <tr
                    key={item.id}
                    className={
                      visibleIdx % 2 === 0
                        ? "bg-background"
                        : "bg-[var(--app-hover)]/40"
                    }
                  >
                    <td className="px-4 py-3 text-muted">{item.sortOrder}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {item.code}
                    </td>
                    <td
                      className="px-4 py-3 font-medium text-foreground"
                      data-testid={rowTestIdPrefix}
                    >
                      {item.label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(item.id, -1)}
                          disabled={isFirst}
                          aria-label={t("moveUp")}
                          className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(item.id, 1)}
                          disabled={isLast}
                          aria-label={t("moveDown")}
                          className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="ml-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppCard>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const indicator = active ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
      >
        {label}
        {indicator && <span aria-hidden>{indicator}</span>}
      </button>
    </th>
  );
}
