"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

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

function subscribeNoop(onStoreChange: () => void) {
  void onStoreChange;
  return () => {};
}
const getBrowserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTz = (): string | undefined => undefined;

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
  const tz = useSyncExternalStore(subscribeNoop, getBrowserTz, getServerTz);

  // Render nothing until the zone is known rather than flash a wrong time.
  if (!tz) return null;

  const when = new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz,
  });

  return <p className={className}>{t("studyLastHint", { when })}</p>;
}
