import { GoogleIntegrationCardActions } from "@/components/integrations/google-integration-card-actions";

type Props = {
  connected: boolean;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export function MeetArtifactsIntegrationCard({
  connected,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Meeting Recap and Recording Info</h2>
      <p className="mt-2 text-sm text-muted">
        {connected
          ? "Connected. We can pull your meeting transcript, AI notes, and recording details after lessons."
          : "Connect this to automatically pull your meeting transcript, AI notes, and recording details after lessons."}
      </p>
      <GoogleIntegrationCardActions
        feature="meet"
        connected={connected}
        onboardingNext={onboardingNext}
        onboardingStep={onboardingStep}
      />
    </article>
  );
}
