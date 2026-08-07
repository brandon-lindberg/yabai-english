import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IntegrationRow } from "@/components/integrations/integration-row";
import { GoogleIntegrationCardActions } from "@/components/integrations/google-integration-card-actions";
import { GoogleCalendarEmbed } from "@/components/integrations/google-calendar-embed";
import { DataList } from "@/components/ui/data-row";
import { Section } from "@/components/ui/section";
import { getTranslations } from "next-intl/server";
import { buildGoogleCalendarEmbedSrc } from "@/lib/google-calendar-embed";
import { isTeacherCalendarReady } from "@/lib/teacher-calendar-status";
import { hasAllGoogleScopes } from "@/lib/google/integration";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { actionLinkClass } from "@/components/ui/inline-link";

type SearchParams = Promise<{
  onboardingNext?: string;
  onboardingStep?: string;
  google?: string;
  feature?: string;
}>;

export async function GoogleIntegrationsSettingsContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.integrationsPage");
  const { onboardingNext, onboardingStep, google: googleStatus } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);
  const locale = await getLocale();

  const [settings, account, userExtras, teacherLegacy] = await Promise.all([
    prisma.googleIntegrationSettings.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.googleIntegrationAccount.findUnique({
      where: { userId: session.user.id },
      select: { grantedScopes: true, revoked: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        studentProfile: { select: { timezone: true } },
      },
    }),
    isTeacherCabinetRole(session.user.role)
      ? prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { googleCalendarRefreshToken: true },
        })
      : null,
  ]);

  const calendarConnectedForEmbed =
    isTeacherCabinetRole(session.user.role)
      ? isTeacherCalendarReady({
          calendarConnected: settings?.calendarConnected,
          legacyRefreshTokenPresent: Boolean(teacherLegacy?.googleCalendarRefreshToken),
        })
      : Boolean(settings?.calendarConnected);

  /*
    Connected at all, and connected with everything, are different questions.

    Users who linked Google under the old per-feature flow hold a partial grant.
    Rather than migrate their rows, the row below reads the scopes Google
    actually returned and offers to reconnect — the only thing that can add a
    missing scope.
  */
  const grantedScopes = account && !account.revoked ? account.grantedScopes : [];
  const googleConnected =
    grantedScopes.length > 0 ||
    Boolean(settings?.calendarConnected || settings?.driveConnected || settings?.meetConnected);
  const googlePartial = googleConnected && !hasAllGoogleScopes(grantedScopes);

  if (onboardingHref && (googleStatus === "connected" || googleConnected)) {
    redirect({ href: onboardingHref as "/onboarding/next", locale });
  }

  const timeZone = userExtras?.studentProfile?.timezone ?? "Asia/Tokyo";
  const userEmail = userExtras?.email ?? session.user.email ?? null;

  const embedSrc = calendarConnectedForEmbed
    ? buildGoogleCalendarEmbedSrc({
        preferredCalendarId: settings?.preferredCalendarId ?? "primary",
        userEmail,
        timeZone,
      })
    : null;

  return (
    <>
      {/* One connection, one row. Connecting Google is a single decision, so it
          is a single control — not three buttons a teacher has to reason about. */}
      <DataList>
        <IntegrationRow
          name={t("identityName")}
          description={t("identityDesc", {
            who: session.user.name || session.user.email || t("googleUser"),
          })}
        />
        <IntegrationRow
          name={t("googleName")}
          description={
            googleConnected
              ? googlePartial
                ? t("googlePartialDesc")
                : t("googleConnectedDesc")
              : t("googleDisconnectedDesc")
          }
          connected={googleConnected && !googlePartial}
          connectedLabel={t("connected")}
          disconnectedLabel={googleConnected ? t("partiallyConnected") : t("notConnected")}
          /*
            Shown only once connected: before that there is nothing to report,
            and three greyed-out lines would read as three things to do — which
            is the choice this screen exists to remove.
          */
          capabilities={
            googleConnected
              ? [
                  { label: t("capabilityCalendar"), enabled: settings?.calendarConnected ?? false },
                  { label: t("capabilityDrive"), enabled: settings?.driveConnected ?? false },
                  { label: t("capabilityMeet"), enabled: settings?.meetConnected ?? false },
                ]
              : undefined
          }
          actions={
            <GoogleIntegrationCardActions
              connected={googleConnected}
              onboardingNext={onboardingHref}
              onboardingStep={onboardingStep ?? null}
            />
          }
        />
      </DataList>

      {embedSrc ? (
        <Section
          title={t("calendarPreviewTitle")}
          description={t("calendarPreviewHint")}
          className="mt-10"
          actions={
            <a
              href="https://calendar.google.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionLinkClass} text-sm`}
            >
              {t("openGoogleCalendar")}
            </a>
          }
        >
          <GoogleCalendarEmbed src={embedSrc} title={t("calendarPreviewTitle")} />
        </Section>
      ) : null}
    </>
  );
}
