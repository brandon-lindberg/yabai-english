"use client";

import { useTranslations } from "next-intl";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { formatLessonInstant } from "@/lib/format-lesson-datetime";

/**
 * "Last practice: {when}" with the timestamp in the viewer's own timezone.
 *
 * The date has to be formatted on the client, but the sentence around it has to
 * stay one translated message — ja puts the label before the value with its own
 * punctuation, so splitting the string would break word order. Rendering the
 * whole line here keeps the message intact and still resolves the zone locally.
 * It previously used `toLocaleString()` inside a server component, i.e. the
 * server's timezone and locale.
 */

export function StudyLastHint({
  iso,
  locale,
  className,
}: {
  iso: string;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("dashboard.highlights");
  const tz = useBrowserTimezone();

  // Render nothing until the zone is known rather than flash a wrong time.
  if (!tz) return null;

  const when = formatLessonInstant(iso, locale, tz);

  return <p className={className}>{t("studyLastHint", { when })}</p>;
}
