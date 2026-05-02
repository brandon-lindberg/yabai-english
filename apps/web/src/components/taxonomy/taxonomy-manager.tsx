"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

export type TaxonomyItem = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
  sortOrder: number;
  active: boolean;
};

type DraftForm = {
  labelEn: string;
  labelJa: string;
};

const emptyDraft: DraftForm = { labelEn: "", labelJa: "" };

const inputCn =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

type SortKey = "sortOrder" | "code" | "labelEn";
type SortDir = "asc" | "desc";

type Props = {
  /** i18n namespace for the page strings (must contain `name`, `nameJa`, `addLevel`, etc). */
  namespace: string;
  /** Endpoint that GETs `{ classLevels: TaxonomyItem[] }` and POSTs new entries. */
  levelsEndpoint: string;
  /** Endpoint that GETs `{ classTypes: TaxonomyItem[] }` and POSTs new entries. */
  typesEndpoint: string;
};

/**
 * Generic per-owner taxonomy editor. Used by both `SchoolTaxonomyManager`
 * (org-scoped) and `TeacherTaxonomyManager` (per-teacher). The owner choice
 * lives entirely in the endpoint URL — the component is owner-agnostic.
 */
export function TaxonomyManager({
  namespace,
  levelsEndpoint,
  typesEndpoint,
}: Props) {
  const t = useTranslations(namespace);
  const [levels, setLevels] = useState<TaxonomyItem[]>([]);
  const [types, setTypes] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(levelsEndpoint).then((r) => r.json()),
      fetch(typesEndpoint).then((r) => r.json()),
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
  }, [levelsEndpoint, typesEndpoint]);

  return (
    <div className="space-y-6">
      <TaxonomySection
        namespace={namespace}
        title={t("classLevelsTitle")}
        addLabel={t("addLevel")}
        emptyLabel={t("noLevels")}
        labelEnPlaceholder={t("levelLabelPlaceholder")}
        labelJaPlaceholder={t("levelLabelJaPlaceholder")}
        items={levels}
        endpoint={levelsEndpoint}
        responseKey="classLevel"
        rowTestIdPrefix="taxonomy-row-label-lvl"
        onCreated={(item) => setLevels((prev) => [...prev, item])}
        onRemoved={(id) => setLevels((prev) => prev.filter((i) => i.id !== id))}
        onReorder={(next) => setLevels(next)}
        loading={loading}
      />

      <TaxonomySection
        namespace={namespace}
        title={t("classTypesTitle")}
        addLabel={t("addType")}
        emptyLabel={t("noTypes")}
        labelEnPlaceholder={t("typeLabelPlaceholder")}
        labelJaPlaceholder={t("typeLabelJaPlaceholder")}
        items={types}
        endpoint={typesEndpoint}
        responseKey="classType"
        rowTestIdPrefix="taxonomy-row-label-typ"
        onCreated={(item) => setTypes((prev) => [...prev, item])}
        onRemoved={(id) => setTypes((prev) => prev.filter((i) => i.id !== id))}
        onReorder={(next) => setTypes(next)}
        loading={loading}
      />

      <CombinationsPreview
        namespace={namespace}
        levels={levels}
        types={types}
        loading={loading}
      />
    </div>
  );
}

function CombinationsPreview({
  namespace,
  levels,
  types,
  loading,
}: {
  namespace: string;
  levels: TaxonomyItem[];
  types: TaxonomyItem[];
  loading: boolean;
}) {
  const t = useTranslations(namespace);
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
                {lvl.labelEn} · {typ.labelEn}
              </span>
            )),
          )}
        </div>
      )}
    </AppCard>
  );
}

type SectionProps = {
  namespace: string;
  title: string;
  addLabel: string;
  emptyLabel: string;
  labelEnPlaceholder: string;
  labelJaPlaceholder: string;
  items: TaxonomyItem[];
  endpoint: string;
  responseKey: "classLevel" | "classType";
  rowTestIdPrefix: string;
  onCreated: (item: TaxonomyItem) => void;
  onRemoved: (id: string) => void;
  onReorder: (next: TaxonomyItem[]) => void;
  loading: boolean;
};

function TaxonomySection({
  namespace,
  title,
  addLabel,
  emptyLabel,
  labelEnPlaceholder,
  labelJaPlaceholder,
  items,
  endpoint,
  responseKey,
  rowTestIdPrefix,
  onCreated,
  onRemoved,
  loading,
  onReorder,
}: SectionProps) {
  const t = useTranslations(namespace);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const labelEnId = useId();
  const labelJaId = useId();

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
        labelEn: draft.labelEn,
        labelJa: draft.labelJa || null,
      }),
    });
    if (!res.ok) {
      setError(res.status === 409 ? t("duplicateName") : t("error"));
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
              <label
                htmlFor={labelEnId}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {t("name")}
              </label>
              <input
                id={labelEnId}
                className={inputCn}
                value={draft.labelEn}
                onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
                placeholder={labelEnPlaceholder}
                required
              />
            </div>
            <div>
              <label
                htmlFor={labelJaId}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {t("nameJa")}
              </label>
              <input
                id={labelJaId}
                className={inputCn}
                value={draft.labelJa}
                onChange={(e) => setDraft({ ...draft, labelJa: e.target.value })}
                placeholder={labelJaPlaceholder}
              />
            </div>
          </div>
          <p className="text-xs text-muted">{t("nameHelp")}</p>
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
                  label={t("nameColumn")}
                  active={sortKey === "labelEn"}
                  dir={sortDir}
                  onClick={() => toggleSort("labelEn")}
                />
                <SortHeader
                  label={t("nameJaColumn")}
                  active={false}
                  dir={sortDir}
                  onClick={() => toggleSort("labelEn")}
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
                    <td
                      className="px-4 py-3 font-medium text-foreground"
                      data-testid={rowTestIdPrefix}
                    >
                      {item.labelEn}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.labelJa ?? "—"}
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
