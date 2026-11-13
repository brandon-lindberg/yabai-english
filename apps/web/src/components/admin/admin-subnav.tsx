"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ADMIN_SUBNAV_ROUTES, adminNavIsCurrent } from "@/lib/admin-subnav-routes";

export function AdminSubnav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const current = ADMIN_SUBNAV_ROUTES.find(([href]) => adminNavIsCurrent(pathname, href));

  return (
    <div className="min-w-0 border-y border-border md:border-y-0 md:border-r md:pr-4">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-sm font-semibold md:hidden">
        <span>{t("label")}{current ? ` · ${t(current[1])}` : ""}</span>
        <span className={open ? "rotate-180" : ""}><InterfaceIcon name="chevron" /></span>
      </button>
      <nav id={id} aria-label={t("label")} className={`${open ? "grid" : "hidden"} gap-1 pb-2 md:sticky md:top-6 md:grid md:pb-0`}>
        {ADMIN_SUBNAV_ROUTES.map(([href, labelKey]) => {
          const active = adminNavIsCurrent(pathname, href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm hover:bg-[var(--app-hover)] hover:text-foreground ${active ? "bg-[var(--app-hover)] font-semibold" : "text-muted"}`}>
            {t(labelKey)}
          </Link>;
        })}
      </nav>
    </div>
  );
}
