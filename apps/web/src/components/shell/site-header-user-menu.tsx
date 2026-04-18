"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  role: string | undefined;
};

export function SiteHeaderUserMenu({ role }: Props) {
  const t = useTranslations("common");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const showProfile =
    role === "STUDENT" || role === "TEACHER" || role === "ADMIN";
  const showIntegrations = role === "STUDENT" || role === "TEACHER";

  // Close menu when tapping outside (iOS Safari doesn't do this natively for <details>)
  useEffect(() => {
    function handleClick(e: MouseEvent | TouchEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, []);

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground transition hover:bg-[var(--app-hover)] [&::-webkit-details-marker]:hidden">
        <span className="max-w-[7rem] truncate">{t("accountMenu")}</span>
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 top-11 z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3 shadow-lg">
        <div className="space-y-1 border-b border-border pb-3">
          {showProfile ? (
            <Link
              href="/dashboard/profile"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("profile")}
            </Link>
          ) : null}
          {showIntegrations ? (
            <Link
              href="/dashboard/integrations"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("integrations")}
            </Link>
          ) : null}
        </div>
        <div className="space-y-3 pt-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted">{t("locale")}</p>
            <LocaleSwitcher />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted">{t("themeToggle")}</p>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-[var(--app-hover)]"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </details>
  );
}
