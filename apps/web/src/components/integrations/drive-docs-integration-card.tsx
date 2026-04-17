import { GoogleIntegrationCardActions } from "@/components/integrations/google-integration-card-actions";

type Props = {
  connected: boolean;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export function DriveDocsIntegrationCard({
  connected,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Google Drive + Docs</h2>
      <p className="mt-2 text-sm text-muted">
        {connected
          ? "Drive/Docs are connected for meeting note summaries and document sharing."
          : "Connect Drive/Docs to create and share notes from meetings in user-owned docs."}
      </p>
      <GoogleIntegrationCardActions
        feature="drive"
        connected={connected}
        onboardingNext={onboardingNext}
        onboardingStep={onboardingStep}
      />
    </article>
  );
}
