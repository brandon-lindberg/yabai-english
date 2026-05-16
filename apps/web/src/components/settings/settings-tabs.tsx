"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type SettingsTab = "payments" | "google";

type Props = {
  activeTab: SettingsTab;
  showPayments?: boolean;
};

export function SettingsTabs({ activeTab, showPayments = false }: Props) {
  const t = useTranslations("dashboard.settingsPage");

  const linkClassName = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-[var(--app-hover)] text-foreground shadow-sm"
        : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"
    }`;

  return (
    <nav
      aria-label={t("tabsAriaLabel")}
      className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1"
    >
      {showPayments ? (
        <Link
          href="/dashboard/settings?tab=payments"
          className={linkClassName(activeTab === "payments")}
          aria-current={activeTab === "payments" ? "page" : undefined}
        >
          {t("tabPayments")}
        </Link>
      ) : null}
      <Link
        href="/dashboard/settings?tab=google"
        className={linkClassName(activeTab === "google")}
        aria-current={activeTab === "google" ? "page" : undefined}
      >
        {t("tabGoogle")}
      </Link>
    </nav>
  );
}
