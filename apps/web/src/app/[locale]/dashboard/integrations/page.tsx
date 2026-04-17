import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GoogleIdentityStatusCard } from "@/components/integrations/google-identity-status-card";
import { CalendarIntegrationCard } from "@/components/integrations/calendar-integration-card";
import { DriveDocsIntegrationCard } from "@/components/integrations/drive-docs-integration-card";
import { MeetArtifactsIntegrationCard } from "@/components/integrations/meet-artifacts-integration-card";
import { GoogleCalendarEmbed } from "@/components/integrations/google-calendar-embed";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { buildGoogleCalendarEmbedSrc } from "@/lib/google-calendar-embed";
import { isTeacherCalendarReady } from "@/lib/teacher-calendar-status";

export default async function DashboardIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.integrationsPage");

  const [settings, userExtras, teacherLegacy] = await Promise.all([
    prisma.googleIntegrationSettings.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        studentProfile: { select: { timezone: true } },
      },
    }),
    session.user.role === "TEACHER"
      ? prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { googleCalendarRefreshToken: true },
        })
      : null,
  ]);

  const calendarConnectedForEmbed =
    session.user.role === "TEACHER"
      ? isTeacherCalendarReady({
          calendarConnected: settings?.calendarConnected,
          legacyRefreshTokenPresent: Boolean(teacherLegacy?.googleCalendarRefreshToken),
        })
      : Boolean(settings?.calendarConnected);

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
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <GoogleIdentityStatusCard email={session.user.email} name={session.user.name} />
        <CalendarIntegrationCard connected={settings?.calendarConnected ?? false} />
        <DriveDocsIntegrationCard connected={settings?.driveConnected ?? false} />
        <MeetArtifactsIntegrationCard connected={settings?.meetConnected ?? false} />
      </div>

      {embedSrc ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">{t("calendarPreviewTitle")}</h2>
            <a
              href="https://calendar.google.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-link hover:opacity-90"
            >
              {t("openGoogleCalendar")}
            </a>
          </div>
          <p className="text-xs text-muted">{t("calendarPreviewHint")}</p>
          <GoogleCalendarEmbed src={embedSrc} title={t("calendarPreviewTitle")} />
        </section>
      ) : null}
    </div>
  );
}
