"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";
import { buttonClasses } from "@/components/ui/button";
import { formatYen } from "@/lib/format-money";
import { CheckRow } from "@/components/ui/check-row";
import { Field, Input } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

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
  const locale = useLocale();
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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={buttonClasses()}
        >
          {t("addPricing")}
        </button>
      </div>

      {showCreate && (
        <AppCard className="mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Same detached labels as the time-off form: no `htmlFor`, no
                wrapping, so neither control had a name. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("duration")} required>
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    required
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                  />
                )}
              </Field>
              <Field label={t("price")} required>
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    required
                    value={form.priceYen}
                    onChange={(e) => setForm({ ...form, priceYen: Number(e.target.value) })}
                  />
                )}
              </Field>
            </div>
            <CheckRow
              checked={form.isGroup}
              onChange={(next) => setForm({ ...form, isGroup: next })}
            >
              {t("group")}
            </CheckRow>
            {error ? (
              <p role="alert">
                <Status tone="error">{error}</Status>
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className={buttonClasses()}
              >
                {saving ? t("creating") : t("create")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={buttonClasses({ variant: "secondary" })}
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
        <div className="divide-y divide-border border-y border-border">
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
                <span className="font-semibold tabular-nums text-foreground">{formatYen(p.priceYen, locale)}</span>
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
