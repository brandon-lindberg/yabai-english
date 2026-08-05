"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

type SettingsTab = "payments" | "tier" | "google";

type Props = {
  activeTab: SettingsTab;
  showPayments?: boolean;
  showTier?: boolean;
};

export function SettingsTabs({ activeTab, showPayments = false, showTier = false }: Props) {
  const t = useTranslations("dashboard.settingsPage");

  return (
    <SubNav label={t("tabsAriaLabel")}>
      {showPayments ? (
        <SubNavLink
          active={activeTab === "payments"}
          render={(p) => (
            <Link href="/dashboard/settings?tab=payments" {...p}>
              {t("tabPayments")}
            </Link>
          )}
        />
      ) : null}
      {showTier ? (
        <SubNavLink
          active={activeTab === "tier"}
          render={(p) => (
            <Link href="/dashboard/settings?tab=tier" {...p}>
              {t("tabTier")}
            </Link>
          )}
        />
      ) : null}
      <SubNavLink
        active={activeTab === "google"}
        render={(p) => (
          <Link href="/dashboard/settings?tab=google" {...p}>
            {t("tabGoogle")}
          </Link>
        )}
      />
    </SubNav>
  );
}
