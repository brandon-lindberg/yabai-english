"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  orgId: string;
  schoolId: string;
  isSchoolAdmin: boolean;
  isSchoolTeacher: boolean;
};

export function SchoolSubnav({
  orgId,
  schoolId,
  isSchoolAdmin,
  isSchoolTeacher,
}: Props) {
  const t = useTranslations("org.school.nav");
  const pathname = usePathname();

  const base = `/org/${orgId}/schools/${schoolId}`;
  const all = [
    { href: base, label: "dashboard", show: true },
    { href: `${base}/schedule`, label: "schedule", show: isSchoolAdmin },
    { href: `${base}/classes`, label: "classes", show: true },
    { href: `${base}/members`, label: "members", show: isSchoolAdmin },
    { href: `${base}/pricing`, label: "pricing", show: isSchoolAdmin },
    {
      href: `${base}/time-off`,
      label: "timeOff",
      show: isSchoolAdmin || isSchoolTeacher,
    },
    { href: `${base}/settings`, label: "settings", show: isSchoolAdmin },
  ];

  const NAV = all.filter((item) => item.show);

  return (
    <nav
      className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label={t("ariaLabel")}
    >
      {NAV.map(({ href, label }) => {
        const active =
          href === base
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--app-hover)] text-foreground shadow-sm"
                : "text-muted hover:bg-[var(--app-hover)] hover:text-foreground"
            }`}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
