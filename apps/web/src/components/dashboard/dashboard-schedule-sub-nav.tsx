"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

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

  return (
    <SubNav label={t("ariaScheduleSections")}>
      {isTeacher ? (
        <SubNavLink
          active={section === "availability"}
          render={(p) => (
            <Link href="/dashboard/schedule/availability" {...p}>
              {t("subNavAvailability")}
            </Link>
          )}
        />
      ) : null}
      <SubNavLink
        active={section === "upcoming"}
        render={(p) => (
          <Link href="/dashboard/schedule" {...p}>
            {t("subNavUpcoming")}
          </Link>
        )}
      />
      <SubNavLink
        active={section === "completed"}
        render={(p) => (
          <Link href="/dashboard/schedule/completed" {...p}>
            {t("subNavCompleted")}
          </Link>
        )}
      />
    </SubNav>
  );
}
