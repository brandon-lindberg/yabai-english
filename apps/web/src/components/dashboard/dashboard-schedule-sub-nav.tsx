"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function scheduleSection(pathname: string): "upcoming" | "completed" {
  if (pathname.includes("/dashboard/schedule/completed")) return "completed";
  return "upcoming";
}

export function DashboardScheduleSubNav() {
  const pathname = usePathname();
  const section = scheduleSection(pathname);
  const t = useTranslations("dashboard.schedulePage");

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1"
      aria-label={t("ariaScheduleSections")}
    >
      <Link
        href="/dashboard/schedule"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          section === "upcoming"
            ? "bg-[var(--app-hover)] text-foreground shadow-sm"
            : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"
        }`}
      >
        {t("subNavUpcoming")}
      </Link>
      <Link
        href="/dashboard/schedule/completed"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          section === "completed"
            ? "bg-[var(--app-hover)] text-foreground shadow-sm"
            : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"
        }`}
      >
        {t("subNavCompleted")}
      </Link>
    </nav>
  );
}
