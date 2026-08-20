"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";
import { buttonClasses } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { inlineLinkClass } from "@/components/ui/inline-link";
import { Status } from "@/components/ui/status";

type Props = {
  acceptedAt: string | null;
};

export function TeacherPaymentPolicyForm({ acceptedAt }: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(Boolean(acceptedAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    if (!checked) {
      setError(t("paymentPolicyCheckboxError"));
      return;
    }

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
    <section className="space-y-3 border-t border-border pt-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("paymentPolicyTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("paymentPolicyIntro")}</p>
      </div>
      <PaymentPolicyNotice audience="teacher" />
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      {accepted ? (
        <p className="text-sm font-medium text-foreground">{t("paymentPolicyAccepted")}</p>
      ) : (
        <div className="space-y-3">
          <CheckRow checked={checked} onChange={setChecked}>
            <span className="leading-relaxed">
              {t("paymentPolicyAcceptCheckboxPrefix")}
              {t("paymentPolicyAcceptCheckboxPrefix") ? " " : null}
              <Link
                href="/legal/terms/teachers"
                target="_blank"
                rel="noopener noreferrer"
                className={inlineLinkClass}
              >
                {t("paymentPolicyAcceptCheckboxTeacherTermsLink")}
              </Link>{" "}
              {t("paymentPolicyAcceptCheckboxJoiner")}{" "}
              <Link
                href="/legal/refund/teachers"
                target="_blank"
                rel="noopener noreferrer"
                className={inlineLinkClass}
              >
                {t("paymentPolicyAcceptCheckboxRefundLink")}
              </Link>
              {t("paymentPolicyAcceptCheckboxSuffix")}
            </span>
          </CheckRow>
          <button
            type="button"
            onClick={() => {
              void onAccept();
            }}
            disabled={saving || !checked}
            className={buttonClasses()}
          >
            {saving ? t("paymentPolicySaving") : t("paymentPolicyAccept")}
          </button>
        </div>
      )}
    </section>
  );
}
