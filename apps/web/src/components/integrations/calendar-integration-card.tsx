import { GoogleIntegrationCardActions } from "@/components/integrations/google-integration-card-actions";

type Props = {
  connected: boolean;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export function CalendarIntegrationCard({
  connected,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Google Calendar + Meet</h2>
      <p className="mt-2 text-sm text-muted">
        {connected
          ? "Calendar sync is connected. New bookings can create Google Calendar events with Meet links."
          : "Connect Calendar to create events and Meet links automatically."}
      </p>
      <GoogleIntegrationCardActions
        feature="calendar"
        connected={connected}
        onboardingNext={onboardingNext}
        onboardingStep={onboardingStep}
      />
    </article>
  );
}
