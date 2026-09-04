"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

type Section = "availability" | "upcoming" | "completed" | "refunded";

function scheduleSection(pathname: string): Section {
  if (pathname.includes("/dashboard/schedule/completed")) return "completed";
  if (pathname.includes("/dashboard/schedule/availability")) return "availability";
  if (pathname.includes("/dashboard/schedule/refunded")) return "refunded";
  // `/dashboard/schedule` is a prefix of every path above, so upcoming can only
  // be the fallthrough — never a match tested first.
  return "upcoming";
}

export function DashboardScheduleSubNav({
  isTeacher,
  hasRefunds,
}: {
  isTeacher: boolean;
  /**
   * A refund is an exception, and most accounts never have one. A permanent
   * tab leading to "No refunded lessons." promises content that is not coming,
   * and it sat between the two tabs people actually use.
   */
  hasRefunds: boolean;
}) {
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
      {/*
        Both parties, not just the teacher: a refund issues a credit note to
        each of them, and this is the only place either can reach it. Shown
        only once one exists.
      */}
      {hasRefunds ? (
        <SubNavLink
          active={section === "refunded"}
          render={(p) => (
            <Link href="/dashboard/schedule/refunded" {...p}>
              {t("subNavRefunded")}
            </Link>
          )}
        />
      ) : null}
    </SubNav>
  );
}
