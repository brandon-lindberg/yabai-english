import type { ReactNode } from "react";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { Status, type StatusTone } from "@/components/ui/status";

/**
 * One lesson in a list.
 *
 * Four components — student upcoming, student completed, teacher upcoming,
 * teacher completed — each rendered this same shape with their own markup:
 * lesson name, time range, the other person, status, actions. That is why they
 * drifted apart in the first place, and why de-carding them meant making the
 * same edit four times.
 *
 * They now share this row. The only real differences between the four are which
 * person is named, whether a status shows, and what the actions are, so those
 * are the props. Anything genuinely specific to one list (completed-lesson
 * materials, calendar recovery) goes in `children` beneath the row.
 */

type Props = {
  /** Anchors deep links like `#booking-<id>`; keeps the scroll offset too. */
  bookingId: string;
  locale: string;
  lessonNameJa: string;
  lessonNameEn: string;
  startsAtIso: string;
  endsAtIso: string;
  /** e.g. "Teacher" on student lists, "Student" on teacher lists. */
  /**
   * The other person in the lesson. Omitted when the row already sits under a
   * heading naming them — a grouped history repeats it on every row otherwise.
   */
  counterpartLabel?: string;
  counterpartName?: string;
  status?: { tone: StatusTone; label: string };
  /** Small supporting line under the counterpart, e.g. a student's goals. */
  meta?: ReactNode;
  /** Chips and links that sit with the status. */
  inlineActions?: ReactNode;
  /** Right-aligned actions on wide screens. */
  actions?: ReactNode;
  /** Extra detail below the row. */
  children?: ReactNode;
  /** Wraps the heading block, e.g. a link to the lesson detail page. */
  headingHref?: ReactNode;
  separator?: string;
};

export function LessonRow({
  bookingId,
  locale,
  lessonNameJa,
  lessonNameEn,
  startsAtIso,
  endsAtIso,
  counterpartLabel,
  counterpartName,
  status,
  meta,
  inlineActions,
  actions,
  children,
  separator,
}: Props) {
  return (
    <li
      id={`booking-${bookingId}`}
      className="scroll-mt-24 border-b border-border py-4 transition-colors duration-300 target:bg-[var(--app-hover)]"
    >
      {/* gap-6 so a long lesson title never butts into the action column. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-bold tracking-[-0.02em] text-foreground">
            {lessonNameJa} / {lessonNameEn}
          </p>
          <LocalBookingDateTimeRange
            locale={locale}
            startsAtIso={startsAtIso}
            endsAtIso={endsAtIso}
            separator={separator}
            className="mt-0.5 block text-sm tabular-nums text-muted"
          />
          {counterpartName ? (
            <p className="text-sm text-muted">
              {counterpartLabel ? `${counterpartLabel}: ` : ""}
              {counterpartName}
            </p>
          ) : null}
          {meta ? <div className="text-xs text-muted">{meta}</div> : null}
          {status || inlineActions ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {status ? <Status tone={status.tone}>{status.label}</Status> : null}
              {inlineActions}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </li>
  );
}

/** The shared empty state for every lesson list. */
export function LessonListEmpty({ children }: { children: ReactNode }) {
  return <li className="border-b border-border py-6 text-muted">{children}</li>;
}
