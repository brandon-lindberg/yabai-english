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

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1"
      aria-label={t("ariaLabel")}
    >
      <Link
        href="/dashboard"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "overview" ? "bg-[var(--app-hover)] text-foreground shadow-sm" : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"}`}
      >
        {t("overview")}
      </Link>
      <Link
        href="/dashboard/profile"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "profile" ? "bg-[var(--app-hover)] text-foreground shadow-sm" : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"}`}
      >
        {t("profile")}
      </Link>
      <Link
        href="/dashboard/schedule"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "schedule" ? "bg-[var(--app-hover)] text-foreground shadow-sm" : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"}`}
      >
        {t("schedule")}
      </Link>
    </nav>
  );
}
