"use client";

import { useVerifiedSession } from "@/hooks/use-verified-session";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { SiteHeaderPrimaryNav, SiteHeaderMobileNav } from "@/components/shell/site-header-primary-nav";
import { SiteHeaderUserMenu } from "@/components/shell/site-header-user-menu";
import { getHeaderPrimaryNavLinks } from "@/lib/shell/header-nav-links";
import { buttonClasses } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { actionLinkClass } from "@/components/ui/inline-link";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { LEARNING_JOURNEYS, journeyPath, journeySignInHref, learningLanguageFromPath } from "@/lib/learning-journey";
import { learningLanguageSchema } from "@/lib/learning-language";
import { selectLearningJourney } from "@/lib/learning-journey-actions";

export function SiteHeader({ guestLearningLanguage = null }: { guestLearningLanguage?: LearningLanguage | null }) {
  const t = useTranslations("common");
  const j = useTranslations("learningJourney");
  const locale = useLocale();
  const pathname = usePathname();
  const query = useSearchParams();
  const { data: session, status } = useVerifiedSession();
  const requested = pathname === "/auth/signin" ? learningLanguageSchema.safeParse(query.get("learningLanguage")) : null;
  const learningLanguage = session?.user?.role === "STUDENT" ? session.user.learningLanguage
    : learningLanguageFromPath(pathname) ?? (requested?.success ? requested.data : guestLearningLanguage);
  const other = learningLanguage === "JAPANESE" ? "ENGLISH" : "JAPANESE";
  const bookAction = !session?.user && learningLanguage ? selectLearningJourney.bind(null, learningLanguage, locale) : undefined;

  const navLinks =
    session?.user && status === "authenticated"
      ? getHeaderPrimaryNavLinks({
          signedIn: true,
          role: session.user.role,
          canStartPlacement: session.user.canStartPlacement,
          activeOrgId: session.user.activeOrgId,
          learningLanguage: session.user.learningLanguage,
        })
      : status === "unauthenticated"
        ? getHeaderPrimaryNavLinks({ signedIn: false, role: undefined }).filter((link) => learningLanguage || link.id !== "book")
        : [];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-header-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-x-3 py-2.5">
          {/*
            `md:mr-10`: the row's `gap-x-3` put the wordmark 12px from the first
            nav link while the nav separates its own links by 24px — so the name
            of the product sat closer to "Dashboard" than "Dashboard" sat to
            "Schedule", and read as the first item in the menu rather than as
            the masthead. It cannot move further left; it is already flush with
            the page gutter, in line with every heading below it. Only from
            `md`, where the nav appears at all.
          */}
          <Link
            href="/"
            className="shrink-0 font-semibold tracking-tight text-foreground md:mr-10"
          >
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
              <SiteHeaderPrimaryNav links={navLinks} bookAction={bookAction} />
              <Link
                href={learningLanguage ? journeySignInHref(learningLanguage) : "/auth/signin"}
                className={buttonClasses({ size: "sm", className: "ml-auto shrink-0" })}
              >
                {t("signIn")}
              </Link>
            </>
          )}
        </div>
        {navLinks.length > 0 && (
          <SiteHeaderMobileNav links={navLinks} bookAction={bookAction} />
        )}
        {(!session?.user || session.user.role === "STUDENT") ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-2 text-sm">
            {learningLanguage ? <><span className="font-semibold">{j(`${LEARNING_JOURNEYS[learningLanguage].key}.current`)}</span><Link href={journeyPath(other)} className={actionLinkClass}>{j(`${LEARNING_JOURNEYS[other].key}.switch`)}</Link></> : null}
            {!session?.user ? (
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <div className="w-36 shrink-0"><LocaleSwitcher /></div>
                <div className="w-40 shrink-0"><ThemeToggle /></div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
