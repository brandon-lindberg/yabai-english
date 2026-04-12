"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function activeTab(pathname: string): "overview" | "profile" | "schedule" {
  if (pathname.includes("/dashboard/profile")) return "profile";
  if (pathname.includes("/dashboard/schedule")) return "schedule";
  return "overview";
}

export function DashboardSubNav() {
  const pathname = usePathname();
  const tab = activeTab(pathname);
  const t = useTranslations("dashboard.nav");

  const tabClass = (key: typeof tab) =>
    key === tab
      ? "border-foreground text-foreground"
      : "border-transparent text-muted hover:text-foreground";

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 border-b border-border"
      aria-label={t("ariaLabel")}
    >
      <Link
        href="/dashboard"
        className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tabClass("overview")}`}
      >
        {t("overview")}
      </Link>
      <Link
        href="/dashboard/profile"
        className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tabClass("profile")}`}
      >
        {t("profile")}
      </Link>
      <Link
        href="/dashboard/schedule"
        className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tabClass("schedule")}`}
      >
        {t("schedule")}
      </Link>
    </nav>
  );
}
