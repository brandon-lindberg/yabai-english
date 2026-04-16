import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GoogleIdentityStatusCard } from "@/components/integrations/google-identity-status-card";
import { CalendarIntegrationCard } from "@/components/integrations/calendar-integration-card";
import { DriveDocsIntegrationCard } from "@/components/integrations/drive-docs-integration-card";
import { MeetArtifactsIntegrationCard } from "@/components/integrations/meet-artifacts-integration-card";

export default async function DashboardIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const settings = await prisma.googleIntegrationSettings.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Google Integrations</h1>
        <p className="text-muted">
          Connect Google features incrementally to keep permissions transparent and minimal.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <GoogleIdentityStatusCard email={session.user.email} name={session.user.name} />
        <CalendarIntegrationCard connected={settings?.calendarConnected ?? false} />
        <DriveDocsIntegrationCard connected={settings?.driveConnected ?? false} />
        <MeetArtifactsIntegrationCard connected={settings?.meetConnected ?? false} />
      </div>
    </div>
  );
}
