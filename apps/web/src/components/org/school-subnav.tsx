"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

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
    { href: `${base}/taxonomy`, label: "taxonomy", show: isSchoolAdmin },
    { href: `${base}/settings`, label: "settings", show: isSchoolAdmin },
  ];

  const NAV = all.filter((item) => item.show);

  return (
    <SubNav label={t("ariaLabel")} showLabel>
      {NAV.map(({ href, label }) => {
        const active =
          href === base
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <SubNavLink
            key={href}
            active={active}
            render={(p) => (
              <Link href={href} {...p}>
                {t(label)}
              </Link>
            )}
          />
        );
      })}
    </SubNav>
  );
}
