"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { SiteHeaderPrimaryNav } from "@/components/shell/site-header-primary-nav";
import { SiteHeaderUserMenu } from "@/components/shell/site-header-user-menu";
import { getHeaderPrimaryNavLinks } from "@/lib/shell/header-nav-links";

export function SiteHeader() {
  const t = useTranslations("common");
  const { data: session, status } = useSession();

  const navLinks =
    session?.user && status === "authenticated"
      ? getHeaderPrimaryNavLinks({
          signedIn: true,
          role: session.user.role,
          canStartPlacement: session.user.canStartPlacement,
        })
      : status === "unauthenticated"
        ? getHeaderPrimaryNavLinks({ signedIn: false, role: undefined })
        : [];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-header-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex min-w-0 max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold tracking-tight text-foreground">
          {t("appName")}
        </Link>

        {session?.user ? (
          <>
            <SiteHeaderPrimaryNav links={navLinks} />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <NotificationBell />
              <SiteHeaderUserMenu role={session.user.role} />
            </div>
          </>
        ) : status === "loading" ? (
          <span className="ml-auto text-sm text-muted">…</span>
        ) : (
          <>
            <SiteHeaderPrimaryNav links={navLinks} />
            <Link
              href="/auth/signin"
              className="ml-auto inline-flex shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("signIn")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
