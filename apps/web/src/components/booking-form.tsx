"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
type LessonProductOption = {
  id: string;
  nameJa: string;
  nameEn: string;
  durationMin: number;
  tier: string;
};

export function BookingForm() {
  const t = useTranslations("booking");
  const [products, setProducts] = useState<LessonProductOption[]>([]);
  const [lessonProductId, setLessonProductId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/lesson-products")
      .then((r) => r.json())
      .then((data: LessonProductOption[]) => {
        setProducts(data);
        if (data[0]) setLessonProductId(data[0].id);
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const iso = startsAt ? new Date(startsAt).toISOString() : "";
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonProductId, startsAt: iso }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Error");
        return;
      }
      setMessage(t("success"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <label className="block text-sm font-medium text-foreground">
        {t("selectProduct")}
        <select
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          value={lessonProductId}
          onChange={(e) => setLessonProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nameJa} — {p.durationMin}
              {p.tier === "FREE_TRIAL" ? ` · ${t("freeTrialOption")}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-foreground">
        {t("selectSlot")}
        <input
          type="datetime-local"
          required
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      {message && (
        <p className="text-sm text-link" role="status">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !lessonProductId}
        className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {t("confirm")}
      </button>
    </form>
  );
}
