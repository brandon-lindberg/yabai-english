"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";
import { buttonClasses } from "@/components/ui/button";

type Props = {
  acceptedAt: string | null;
};

const legalLinkClassName =
  "font-medium text-link underline-offset-4 hover:underline";

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
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
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
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span className="leading-relaxed">
              {t("paymentPolicyAcceptCheckboxPrefix")}
              {t("paymentPolicyAcceptCheckboxPrefix") ? " " : null}
              <Link
                href="/legal/terms/teachers"
                target="_blank"
                rel="noopener noreferrer"
                className={legalLinkClassName}
              >
                {t("paymentPolicyAcceptCheckboxTeacherTermsLink")}
              </Link>{" "}
              {t("paymentPolicyAcceptCheckboxJoiner")}{" "}
              <Link
                href="/legal/refund/teachers"
                target="_blank"
                rel="noopener noreferrer"
                className={legalLinkClassName}
              >
                {t("paymentPolicyAcceptCheckboxRefundLink")}
              </Link>
              {t("paymentPolicyAcceptCheckboxSuffix")}
            </span>
          </label>
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
