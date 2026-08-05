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

/**
 * Primary navigation, set as type rather than as filled pills.
 *
 * The pill version gave the active item its own rounded container, so the
 * header carried a small box on every screen. Weight and ink do that job here:
 * the current section is bold and full-contrast, the rest are muted. It also
 * gains `aria-current="page"`, which the colour-only version never exposed.
 */
export function SiteHeaderPrimaryNav({ links }: Props) {
  const pathname = usePathname();
  const t = useTranslations("common");

  if (links.length === 0) return null;

  return (
    <nav
      className="hidden min-w-0 items-center gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-1 md:justify-center lg:justify-start [&::-webkit-scrollbar]:hidden"
      aria-label={t("primaryNavAria")}
    >
      {links.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap text-sm transition-colors ${
              active
                ? "font-bold text-foreground"
                : "font-medium text-muted hover:text-foreground"
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
      className="flex items-center gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      aria-label={t("primaryNavAria")}
    >
      {links.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap text-xs transition-colors ${
              active ? "font-bold text-foreground" : "font-medium text-muted hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
