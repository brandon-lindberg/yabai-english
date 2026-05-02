"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type Pricing = {
  id: string;
  lessonLevel?: string;
  lessonType?: string;
  durationMin: number;
  priceYen: number;
  isGroup: boolean;
};

type Props = { orgId: string; schoolId: string };

export function SchoolPricingView({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.pricingPage");
  const [items, setItems] = useState<Pricing[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    durationMin: 50,
    priceYen: 3000,
    lessonLevel: "",
    lessonType: "",
    isGroup: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}/pricing`)
      .then((r) => r.json())
      .then((d) => setItems(d.pricing ?? []));
  }, [orgId, schoolId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/org/${orgId}/schools/${schoolId}/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationMin: form.durationMin,
        priceYen: form.priceYen,
        lessonLevel: form.lessonLevel || undefined,
        lessonType: form.lessonType || undefined,
        isGroup: form.isGroup,
      }),
    });

    if (!res.ok) {
      setError(t("error"));
      setSaving(false);
      return;
    }

    const { pricing } = await res.json();
    setItems((prev) => [...prev, pricing]);
    setShowCreate(false);
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
          {t("addPricing")}
        </button>
      </div>

      {showCreate && (
        <AppCard className="mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("duration")}
                </label>
                <input
                  type="number"
                  className={inputCn}
                  value={form.durationMin}
                  onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("price")}
                </label>
                <input
                  type="number"
                  className={inputCn}
                  value={form.priceYen}
                  onChange={(e) => setForm({ ...form, priceYen: Number(e.target.value) })}
                  min={0}
                  required
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isGroup}
                onChange={(e) => setForm({ ...form, isGroup: e.target.checked })}
              />
              {t("group")}
            </label>
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

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("noPricing")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium text-foreground">
                  {t("minutes", { min: p.durationMin })}
                </span>
                <span className="text-muted">
                  {p.lessonLevel || t("default")} · {p.lessonType || t("default")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">¥{p.priceYen.toLocaleString()}</span>
                <span className="rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs">
                  {p.isGroup ? t("group") : t("individual")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
