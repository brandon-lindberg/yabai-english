"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteHeaderPreferences } from "./site-header-preferences";
import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { InterfaceIcon } from "@/components/ui/interface-icon";

type Props = {
  role: string | undefined;
};

export function SiteHeaderUserMenu({ role }: Props) {
  const t = useTranslations("common");

  // No Profile entry: it has its own tab in the dashboard sub-nav, and this
  // menu is for the things with nowhere else to live.
  const showSettings = role === "STUDENT" || role === "TEACHER" || role === "SUPER_ADMIN";

  return (
    <DisclosureMenu label={t("accountMenu")} trigger={<><span className="max-w-[7rem] truncate">{t("accountMenu")}</span><InterfaceIcon name="chevron" /></>}
      triggerClassName="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground transition hover:bg-[var(--app-hover)]"
      panelClassName="w-[min(18rem,calc(100vw-2rem))]">
        <div className="space-y-1 border-b border-border pb-3">
          {showSettings ? (
            <Link
              href="/dashboard/settings"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("settings")}
            </Link>
          ) : null}
        </div>
        <div className="space-y-3 pt-3">
          <SiteHeaderPreferences labelled />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-[var(--app-hover)]"
          >
            {t("signOut")}
          </button>
        </div>
    </DisclosureMenu>
  );
}
