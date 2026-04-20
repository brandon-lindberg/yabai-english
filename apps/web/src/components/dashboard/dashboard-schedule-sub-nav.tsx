"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Section = "availability" | "upcoming" | "completed";

function scheduleSection(pathname: string): Section {
  if (pathname.includes("/dashboard/schedule/completed")) return "completed";
  if (pathname.includes("/dashboard/schedule/availability")) return "availability";
  return "upcoming";
}

export function DashboardScheduleSubNav({ isTeacher }: { isTeacher: boolean }) {
  const pathname = usePathname();
  const section = scheduleSection(pathname);
  const t = useTranslations("dashboard.schedulePage");

  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-[var(--app-hover)] text-foreground shadow-sm"
        : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"
    }`;

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1"
      aria-label={t("ariaScheduleSections")}
    >
      {isTeacher && (
        <Link href="/dashboard/schedule/availability" className={linkClass(section === "availability")}>
          {t("subNavAvailability")}
        </Link>
      )}
      <Link href="/dashboard/schedule" className={linkClass(section === "upcoming")}>
        {t("subNavUpcoming")}
      </Link>
      <Link href="/dashboard/schedule/completed" className={linkClass(section === "completed")}>
        {t("subNavCompleted")}
      </Link>
    </nav>
  );
}
