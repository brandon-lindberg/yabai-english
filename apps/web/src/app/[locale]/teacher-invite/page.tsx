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
import { prisma } from "@/lib/prisma";
import { parseTeacherInvitationCookie, teacherInvitationCookieName, teacherInvitationHasGoogleProof } from "@/lib/teacher-invitations";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TeacherInvitationPage({ searchParams }: {
  searchParams: Promise<{ status?: string; mode?: string }>;
}) {
  const [locale, t, session, store, { status, mode }] = await Promise.all([
    getLocale(), getTranslations("teacherInvitation"), auth(), cookies(), searchParams,
  ]);
  const account = session?.user;
  const unavailable = status === "unavailable";
  const context = parseTeacherInvitationCookie(store.get(teacherInvitationCookieName(true))?.value ?? store.get(teacherInvitationCookieName(false))?.value);
  const verifyEmail = mode === "email" && !(account && context?.attempt && await teacherInvitationHasGoogleProof(prisma, context, account.id));
  const intro = unavailable ? "unavailable" : verifyEmail ? "emailIntro" : account ? "signedInIntro" : "intro";
  return <main className="flex flex-1 flex-col">
    <AuthPageShell>
      <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t(unavailable ? "unavailableTitle" : "title")}</h1>
      <p className="mt-3 text-muted">{t(intro)}</p>
      <div className="mt-6 space-y-4">
        {status === "google-error" && <InlineAlert>{t("googleError")}</InlineAlert>}
        {status === "ineligible" && <InlineAlert>{t("ineligible")}</InlineAlert>}
        {!status && verifyEmail && account && context?.attempt && <InlineAlert role="alert" variant="warning">{t("emailMismatch")}</InlineAlert>}
        {!unavailable && <TeacherInvitationForm action={continueTeacherInvitation.bind(null, locale)}
          account={account ? account.email ?? account.name ?? t("currentAccount") : null}
          canAccept={account?.role === "STUDENT"} pendingLink={Boolean(context)} verifyEmail={verifyEmail} />}
        <Link href="/" className={actionLinkClass}>{t("home")}</Link>
      </div>
    </AuthPageShell>
  </main>;
}
