"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { HeaderNavLink } from "@/lib/shell/header-nav-links";

type Props = { links: HeaderNavLink[]; bookAction?: () => Promise<void> };

function NavItems({ links, bookAction, mobile = false }: Props & { mobile?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("common");
  return links.map((item) => {
    const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const className = `inline-flex min-h-9 shrink-0 items-center whitespace-nowrap transition-colors ${mobile ? "text-xs" : "text-sm"} ${active ? "font-bold text-foreground" : "font-medium text-muted hover:text-foreground"}`;
    if (item.id === "book" && bookAction) {
      return <form key={item.id} action={bookAction}><button type="submit" className={className}>{t(item.labelKey)}</button></form>;
    }
    return <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined} className={className}>{t(item.labelKey)}</Link>;
  });
}

export function SiteHeaderPrimaryNav(props: Props) {
  const t = useTranslations("common");
  if (props.links.length === 0) return null;
  return <nav className="hidden min-w-0 items-center gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-1 md:justify-center lg:justify-start [&::-webkit-scrollbar]:hidden" aria-label={t("primaryNavAria")}><NavItems {...props} /></nav>;
}

export function SiteHeaderMobileNav(props: Props) {
  const t = useTranslations("common");
  if (props.links.length === 0) return null;
  return <nav className="flex items-center gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden" aria-label={t("primaryNavAria")}><NavItems {...props} mobile /></nav>;
}
