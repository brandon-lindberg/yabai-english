"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Tab = "overview" | "profile" | "lessons" | "students" | "myTeachers" | "schedule" | "taxonomy";

function activeTab(pathname: string): Tab {
  if (pathname.includes("/dashboard/profile")) return "profile";
  if (pathname.includes("/dashboard/lessons")) return "lessons";
  if (pathname.includes("/dashboard/students")) return "students";
  if (pathname.includes("/dashboard/my-teachers")) return "myTeachers";
  if (pathname.includes("/dashboard/schedule")) return "schedule";
  if (pathname.includes("/dashboard/taxonomy")) return "taxonomy";
  return "overview";
}

export function DashboardSubNav({
  isTeacher = false,
  isStudent = false,
}: {
  isTeacher?: boolean;
  isStudent?: boolean;
}) {
  const pathname = usePathname();
  const tab = activeTab(pathname);
  const t = useTranslations("dashboard.nav");

  const linkCn = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-[var(--app-hover)] text-foreground shadow-sm"
        : "text-muted hover:bg-[var(--app-hover)]/60 hover:text-foreground"
    }`;

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1"
      aria-label={t("ariaLabel")}
    >
      <Link href="/dashboard" className={linkCn(tab === "overview")}>
        {t("overview")}
      </Link>
      <Link href="/dashboard/profile" className={linkCn(tab === "profile")}>
        {t("profile")}
      </Link>
      {isTeacher ? (
        <Link href="/dashboard/lessons" className={linkCn(tab === "lessons")}>
          {t("lessons")}
        </Link>
      ) : null}
      {isTeacher ? (
        <Link href="/dashboard/students" className={linkCn(tab === "students")}>
          {t("students")}
        </Link>
      ) : null}
      {isStudent ? (
        <Link href="/dashboard/my-teachers" className={linkCn(tab === "myTeachers")}>
          {t("myTeachers")}
        </Link>
      ) : null}
      <Link href="/dashboard/schedule" className={linkCn(tab === "schedule")}>
        {t("schedule")}
      </Link>
      {isTeacher ? (
        <Link href="/dashboard/taxonomy" className={linkCn(tab === "taxonomy")}>
          {t("taxonomy")}
        </Link>
      ) : null}
    </nav>
  );
}
