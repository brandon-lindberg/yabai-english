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

  const tabClass = (key: typeof section) =>
    key === section
      ? "border-foreground text-foreground"
      : "border-transparent text-muted hover:text-foreground";

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border"
      aria-label={t("ariaScheduleSections")}
    >
      <Link
        href="/dashboard/schedule"
        className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tabClass("upcoming")}`}
      >
        {t("subNavUpcoming")}
      </Link>
      <Link
        href="/dashboard/schedule/completed"
        className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tabClass("completed")}`}
      >
        {t("subNavCompleted")}
      </Link>
    </nav>
  );
}
