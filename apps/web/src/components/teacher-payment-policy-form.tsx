"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";

type Props = {
  acceptedAt: string | null;
};

export function TeacherPaymentPolicyForm({ acceptedAt }: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const [accepted, setAccepted] = useState(Boolean(acceptedAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/payment-policy", { method: "POST" });
      if (!res.ok) {
        setError(t("paymentPolicyError"));
        return;
      }
      setAccepted(true);
    } catch {
      setError(t("paymentPolicyError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("paymentPolicyTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("paymentPolicyIntro")}</p>
      </div>
      <PaymentPolicyNotice audience="teacher" />
      {error ? (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      ) : null}
      {accepted ? (
        <p className="text-sm font-medium text-foreground">{t("paymentPolicyAccepted")}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            void onAccept();
          }}
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("paymentPolicySaving") : t("paymentPolicyAccept")}
        </button>
      )}
    </section>
  );
}
