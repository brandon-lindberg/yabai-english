"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";

export function SiteHeader() {
  const t = useTranslations("common");
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-header-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          {t("appName")}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <LocaleSwitcher />
          {session?.user ? (
            <>
              <NotificationBell />
              <Link
                href="/learn"
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                {t("learn")}
              </Link>
              {session.user.role === "STUDENT" && (
                <Link
                  href="/placement"
                  className="text-sm font-medium text-muted hover:text-foreground"
                >
                  {t("placement")}
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                {t("dashboard")}
              </Link>
              {(session.user.role === "TEACHER" ||
                session.user.role === "ADMIN") && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-accent hover:opacity-90"
                >
                  {t("admin")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
              >
                {t("signOut")}
              </button>
            </>
          ) : status === "loading" ? (
            <span className="text-sm text-muted">…</span>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t("signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
