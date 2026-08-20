"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

type Props = { orgId: string };

export function OrgSubnav({ orgId }: Props) {
  const t = useTranslations("org.nav");
  const pathname = usePathname();

  const NAV = [
    [`/org/${orgId}`, "dashboard"],
    [`/org/${orgId}/schools`, "schools"],
    [`/org/${orgId}/members`, "members"],
    [`/org/${orgId}/settings`, "settings"],
  ] as const;

  return (
    <SubNav label={t("ariaLabel")} showLabel>
      {NAV.map(([href, labelKey]) => {
        const active =
          href === `/org/${orgId}`
            ? pathname === `/org/${orgId}`
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <SubNavLink
            key={href}
            active={active}
            render={(p) => (
              <Link href={href} {...p}>
                {t(labelKey)}
              </Link>
            )}
          />
        );
      })}
    </SubNav>
  );
}
