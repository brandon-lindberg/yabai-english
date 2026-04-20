"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

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
    <nav
      className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label={t("ariaLabel")}
    >
      {NAV.map(([href, labelKey]) => {
        const active =
          href === `/org/${orgId}`
            ? pathname === `/org/${orgId}`
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
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
