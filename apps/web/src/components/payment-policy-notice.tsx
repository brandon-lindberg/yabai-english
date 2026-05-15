"use client";

import { useTranslations } from "next-intl";

type Props = {
  audience: "student" | "teacher";
  className?: string;
};

export function PaymentPolicyNotice({ audience, className = "" }: Props) {
  const t = useTranslations(`paymentPolicy.${audience}`);
  const items = ["transaction", "platformFee", "refunds", "failure"] as const;

  return (
    <section
      className={`rounded-lg border border-border bg-background p-4 ${className}`}
      aria-label={t("title")}
    >
      <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item}>{t(item)}</li>
        ))}
      </ul>
    </section>
  );
}
