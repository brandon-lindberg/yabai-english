"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const NAV = [
  ["/admin", "overview"],
  ["/admin/users", "users"],
  ["/admin/teachers", "teachers"],
  ["/admin/students", "students"],
  ["/admin/reports", "reports"],
] as const;

export function AdminSubnav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label="Admin"
    >
      {NAV.map(([href, labelKey]) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--app-hover)] text-foreground"
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
