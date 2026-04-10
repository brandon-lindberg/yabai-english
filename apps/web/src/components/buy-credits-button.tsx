"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function BuyCreditsButton() {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);

  async function buyPack(credits: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      alert(data.error ?? "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {[1, 5, 10].map((n) => (
        <button
          key={n}
          type="button"
          disabled={loading}
          onClick={() => buyPack(n)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
        >
          {t("buyCredits")} ×{n}
        </button>
      ))}
    </div>
  );
}
