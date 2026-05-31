"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StripeBrandButton } from "@/components/stripe/stripe-brand-button";

type SavedCard = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type Props = {
  stripeConnectEnabled: boolean;
};

export function StudentPaymentsSettings({ stripeConnectEnabled }: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripeConnectEnabled) {
      setLoading(false);
      return;
    }
    void fetch("/api/student/payment-methods/stripe")
      .then((res) => res.json())
      .then((data: { savedCard?: SavedCard | null }) => {
        setSavedCard(data.savedCard ?? null);
      })
      .finally(() => setLoading(false));
  }, [stripeConnectEnabled]);

  async function savePaymentMethod() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/student/payment-methods/stripe/setup", { method: "POST" });
      if (!res.ok) {
        setError(
          res.status === 503 ? t("studentPaymentsUnavailable") : t("studentSavePaymentError"),
        );
        return;
      }
      const data = (await res.json()) as { setupUrl?: string };
      if (data.setupUrl) {
        window.location.assign(data.setupUrl);
      }
    } catch {
      setError(t("studentSavePaymentError"));
    } finally {
      setSaving(false);
    }
  }

  if (!stripeConnectEnabled) {
    return <p className="text-sm text-muted">{t("studentPaymentsUnavailable")}</p>;
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t("studentPaymentsTitle")}</h3>
        <p className="mt-1 text-sm text-muted">{t("studentPaymentsIntro")}</p>
      </div>
      {loading ? (
        <p className="text-sm text-muted">{t("studentPaymentsLoading")}</p>
      ) : savedCard ? (
        <p className="text-sm text-foreground">
          {t("studentSavedCard", {
            brand: savedCard.brand,
            last4: savedCard.last4,
          })}
        </p>
      ) : (
        <p className="text-sm text-muted">{t("studentNoSavedCard")}</p>
      )}
      {error ? (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      ) : null}
      <StripeBrandButton
        onClick={() => {
          void savePaymentMethod();
        }}
        loading={saving}
        prefixLabel={
          savedCard ? t("studentUpdateSavedCardPrefix") : t("studentSavePaymentMethodPrefix")
        }
        aria-label={
          savedCard ? t("studentUpdateSavedCard") : t("studentSavePaymentMethod")
        }
      />
      <p className="text-xs text-muted">{t("studentPaymentsCheckoutFallback")}</p>
    </section>
  );
}
