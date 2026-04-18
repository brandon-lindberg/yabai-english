"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { HeaderNavLink } from "@/lib/shell/header-nav-links";

type Props = {
  links: HeaderNavLink[];
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.endsWith("/dashboard");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeaderPrimaryNav({ links }: Props) {
  const pathname = usePathname();
  const t = useTranslations("common");

  if (links.length === 0) return null;

  return (
    <nav
      className="hidden min-w-0 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-1 md:justify-center lg:justify-start [&::-webkit-scrollbar]:hidden"
      aria-label={t("primaryNavAria")}
    >
      {links.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--app-hover)] text-foreground"
                : "text-muted hover:bg-[var(--app-hover)] hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Horizontal-scrolling nav shown below the header row on mobile only. */
export function SiteHeaderMobileNav({ links }: Props) {
  const pathname = usePathname();
  const t = useTranslations("common");

  if (links.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      aria-label={t("primaryNavAria")}
    >
      {links.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              active
                ? "bg-[var(--app-hover)] text-foreground"
                : "text-muted hover:bg-[var(--app-hover)] hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
