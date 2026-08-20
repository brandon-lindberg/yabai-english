"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ADMIN_SUBNAV_ROUTES } from "@/lib/admin-subnav-routes";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

export function AdminSubnav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <SubNav label="Admin">
      {ADMIN_SUBNAV_ROUTES.map(([href, labelKey]) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
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
