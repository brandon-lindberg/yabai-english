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
      className="order-last flex min-w-0 w-full basis-full items-center gap-0.5 overflow-x-auto pb-0.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] md:order-none md:w-auto md:flex-1 md:basis-auto md:justify-center md:pb-0 md:pt-0 lg:justify-start [&::-webkit-scrollbar]:hidden"
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
