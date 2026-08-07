import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Status } from "@/components/ui/status";

/**
 * The onboarding checklist, for whichever flow is being set up.
 *
 * Students and teachers were each given their own answer to the same question —
 * "what is left to set up, and how far along am I" — and the two drifted badly.
 * The student list had been rebuilt on ruled rows with a derived completion
 * mark; the teacher list was still boxes nested inside an `AppCard`, with the
 * progress header and the footer band re-implemented alongside it.
 *
 * What stays different is the interaction, not the chrome. A student's row is
 * pure navigation, so the whole row is the target. A teacher's row carries a
 * checkbox — and sometimes a skip button and a policy notice — so the row must
 * not be a link at all: it gets an explicit "open" affordance instead. Passing
 * `onToggle` picks the second shape.
 *
 * Hook-free on purpose. The student's list is server-rendered and the teacher's
 * lives inside a client form; a `use client` here would pull the student's page
 * into the bundle for nothing.
 */

export type OnboardingChecklistItem = {
  key: string;
  title: string;
  body: string;
  /** `null` when the step cannot be opened yet — the placement retake cooldown. */
  href: string | null;
  completed: boolean;
  /** Sits below the body. The teacher's payments step carries the policy notice. */
  note?: ReactNode;
  /** Sits after the open link. The teacher's optional steps offer "skip". */
  action?: ReactNode;
  /**
   * Present only where completion is self-reported rather than derived, which
   * today means the teacher flow. Renders the mark as a checkbox.
   */
  onToggle?: (next: boolean) => void;
};

const MARK_BASE =
  "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs font-bold";

function StepMark({ item }: { item: OnboardingChecklistItem }) {
  const testProps = {
    "data-testid": `step-status-${item.key}`,
    "data-completed": item.completed ? "true" : "false",
  };

  if (item.onToggle) {
    const toggle = item.onToggle;
    return (
      <input
        {...testProps}
        type="checkbox"
        checked={item.completed}
        onChange={(e) => toggle(e.target.checked)}
        aria-label={item.title}
        className="mt-0.5 h-6 w-6 flex-none accent-[var(--app-primary)]"
      />
    );
  }

  /*
    Solid ink when done, the world's "settled" state — the same condensation the
    `Choice` component uses for a correct answer. This was a faint hover-grey
    disc, which read as "slightly emphasised" rather than "finished".
  */
  return (
    <span
      {...testProps}
      aria-hidden="true"
      className={`${MARK_BASE} ${
        item.completed
          ? "border-foreground bg-foreground text-[var(--app-canvas)]"
          : "border-border bg-surface text-muted"
      }`}
    >
      {item.completed ? "✓" : ""}
    </span>
  );
}

function StepContent({
  item,
  completedLabel,
  openLabel,
}: {
  item: OnboardingChecklistItem;
  completedLabel: string;
  openLabel?: string;
}) {
  /* A row with its own controls cannot also be a link, so it says "open". */
  const selfContained = Boolean(item.onToggle);

  return (
    <div className="flex items-start gap-3">
      <StepMark item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-foreground">{item.title}</p>
          {item.completed ? <Status tone="settled">{completedLabel}</Status> : null}
        </div>
        <p className="mt-1 text-sm text-muted">{item.body}</p>

        {selfContained && ((item.href && openLabel) || item.action) ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {item.href && openLabel ? (
              <a
                href={item.href}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                {openLabel}
              </a>
            ) : null}
            {item.href && openLabel && item.action ? (
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
            ) : null}
            {item.action}
          </p>
        ) : null}

        {item.note}
      </div>
    </div>
  );
}

export function OnboardingChecklist({
  items,
  percent,
  progressLabel,
  completedLabel,
  openLabel,
  hint,
  actions,
  error,
  testIdPrefix,
}: {
  items: ReadonlyArray<OnboardingChecklistItem>;
  percent: number;
  /** Doubles as the bar's accessible name and its printed count. */
  progressLabel: string;
  completedLabel: string;
  /** Only reached by rows that carry their own controls, so only those flows pass it. */
  openLabel?: string;
  hint: string;
  /** The finish / skip buttons, which submit in one flow and navigate in the other. */
  actions: ReactNode;
  error?: string | null;
  /** Preserves each flow's existing test hooks. */
  testIdPrefix: string;
}) {
  return (
    <div>
      <section
        aria-label={progressLabel}
        className="flex items-center gap-3"
        data-testid={`${testIdPrefix}-progress`}
      >
        {/* Both flows had hand-built bars marked `aria-hidden`, so the value was
            never announced. This is the same bar study and placement use. */}
        <ProgressBar
          testId={`${testIdPrefix}-progress-bar`}
          percent={percent}
          label={progressLabel}
          valueText={progressLabel}
          size="sm"
          className="flex-1"
        />
        <p
          className="text-xs font-medium tabular-nums text-muted"
          data-testid={`${testIdPrefix}-progress-label`}
        >
          {progressLabel}
        </p>
      </section>

      <ul className="mt-6 list-none border-t border-border p-0">
        {items.map((item) => {
          const content = (
            <StepContent item={item} completedLabel={completedLabel} openLabel={openLabel} />
          );
          const rowProps = {
            "data-testid": `step-card-${item.key}`,
            "data-completed": item.completed ? "true" : "false",
          };

          if (item.onToggle) {
            return (
              <li key={item.key} {...rowProps} className="border-b border-border py-5">
                {content}
              </li>
            );
          }

          if (!item.href) {
            return (
              <li
                key={item.key}
                {...rowProps}
                aria-label={
                  item.completed ? `${item.title} (${completedLabel})` : item.title
                }
                className="border-b border-border py-5 opacity-60"
              >
                {content}
              </li>
            );
          }

          return (
            <li key={item.key} className="border-b border-border">
              <a
                {...rowProps}
                href={item.href}
                aria-label={
                  item.completed ? `${item.title} (${completedLabel})` : item.title
                }
                className="block py-5 text-foreground transition-colors hover:bg-[var(--app-hover)]"
              >
                {content}
              </a>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-4">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}

      <div className="mt-8 flex flex-col items-start gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{hint}</p>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}
