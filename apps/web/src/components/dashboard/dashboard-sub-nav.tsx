"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

type Tab =
  | "overview"
  | "profile"
  | "lessons"
  | "students"
  | "myTeachers"
  | "schedule"
  | "taxonomy"
  | "invoices"
  /** Routes outside this nav (e.g. Settings from the account menu). */
  | "none";

function activeTab(pathname: string): Tab {
  if (pathname.includes("/dashboard/profile")) return "profile";
  if (pathname.includes("/dashboard/lessons")) return "lessons";
  if (pathname.includes("/dashboard/students")) return "students";
  if (pathname.includes("/dashboard/my-teachers")) return "myTeachers";
  if (pathname.includes("/dashboard/schedule")) return "schedule";
  if (pathname.includes("/dashboard/taxonomy")) return "taxonomy";
  if (pathname.includes("/dashboard/invoices")) return "invoices";
  if (pathname.includes("/dashboard/settings")) return "none";
  if (pathname.includes("/dashboard/integrations")) return "none";
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

  if (tab === "none") return null;

  return (
    <SubNav label={t("ariaLabel")}>
      <SubNavLink
        active={tab === "overview"}
        render={(p) => (
          <Link href="/dashboard" {...p}>
            {t("overview")}
          </Link>
        )}
      />
      <SubNavLink
        active={tab === "profile"}
        render={(p) => (
          <Link href="/dashboard/profile" {...p}>
            {t("profile")}
          </Link>
        )}
      />
      {isTeacher ? (
        <SubNavLink
          active={tab === "lessons"}
          render={(p) => (
            <Link href="/dashboard/lessons" {...p}>
              {t("lessons")}
            </Link>
          )}
        />
      ) : null}
      {isTeacher ? (
        <SubNavLink
          active={tab === "students"}
          render={(p) => (
            <Link href="/dashboard/students" {...p}>
              {t("students")}
            </Link>
          )}
        />
      ) : null}
      {isTeacher ? (
        <SubNavLink
          active={tab === "invoices"}
          render={(p) => (
            <Link href="/dashboard/invoices" {...p}>
              {t("invoices")}
            </Link>
          )}
        />
      ) : null}
      {isStudent ? (
        <SubNavLink
          active={tab === "myTeachers"}
          render={(p) => (
            <Link href="/dashboard/my-teachers" {...p}>
              {t("myTeachers")}
            </Link>
          )}
        />
      ) : null}
      <SubNavLink
        active={tab === "schedule"}
        render={(p) => (
          <Link href="/dashboard/schedule" {...p}>
            {t("schedule")}
          </Link>
        )}
      />
      {isTeacher ? (
        <SubNavLink
          active={tab === "taxonomy"}
          render={(p) => (
            <Link href="/dashboard/taxonomy" {...p}>
              {t("taxonomy")}
            </Link>
          )}
        />
      ) : null}
    </SubNav>
  );
}
