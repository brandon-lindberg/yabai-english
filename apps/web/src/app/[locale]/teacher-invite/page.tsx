import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { TeacherInvitationForm } from "@/components/auth/teacher-invitation-form";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";
import { continueTeacherInvitation } from "@/lib/teacher-invitation-actions";
import { teacherInvitationCookieName } from "@/lib/teacher-invitations";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TeacherInvitationPage({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [locale, t, session, store, { status }] = await Promise.all([
    getLocale(), getTranslations("teacherInvitation"), auth(), cookies(), searchParams,
  ]);
  const account = session?.user;
  const unavailable = status === "unavailable";
  const pendingLink = store.has(teacherInvitationCookieName(true)) || store.has(teacherInvitationCookieName(false));
  return <main className="flex flex-1 flex-col">
    <AuthPageShell>
      <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t(unavailable ? "unavailableTitle" : "title")}</h1>
      <p className="mt-3 text-muted">{t(unavailable ? "unavailable" : account ? "signedInIntro" : "intro")}</p>
      <div className="mt-6 space-y-4">
        {status === "google-error" && <InlineAlert>{t("googleError")}</InlineAlert>}
        {status === "ineligible" && <InlineAlert>{t("ineligible")}</InlineAlert>}
        {!unavailable && <TeacherInvitationForm action={continueTeacherInvitation.bind(null, locale)}
          account={account ? account.email ?? account.name ?? t("currentAccount") : null}
          canAccept={account?.role === "STUDENT"} pendingLink={pendingLink} />}
        <Link href="/" className={actionLinkClass}>{t("home")}</Link>
      </div>
    </AuthPageShell>
  </main>;
}
