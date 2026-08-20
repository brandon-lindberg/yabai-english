import { Status } from "@/components/ui/status";

/**
 * Save feedback for forms.
 *
 * Seven forms each rolled their own `status === "saved"` line, which drifted in
 * wording, colour and placement. More importantly they rendered as plain
 * paragraphs: a screen-reader user pressed Save and was told nothing, because
 * nothing was in a live region.
 *
 * Success announces politely via role="status"; failure interrupts via
 * role="alert", which is the distinction those roles exist to make. The tones
 * come from the same ladder the rest of the app uses — a save in flight is
 * genuinely pending, a saved record is settled.
 */
export type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  state: SaveState;
  savingLabel: string;
  savedLabel: string;
  errorLabel: string;
  className?: string;
};

export function FormStatus({
  state,
  savingLabel,
  savedLabel,
  errorLabel,
  className = "",
}: Props) {
  if (state === "idle") return null;

  if (state === "error") {
    return (
      <p role="alert" className={className}>
        <Status tone="error">{errorLabel}</Status>
      </p>
    );
  }

  return (
    <p role="status" aria-live="polite" className={className}>
      <Status tone={state === "saving" ? "pending" : "settled"}>
        {state === "saving" ? savingLabel : savedLabel}
      </Status>
    </p>
  );
}
