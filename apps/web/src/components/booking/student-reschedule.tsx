"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { SlotOption } from "@/lib/slot-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";

/** No action is rendered until the server confirms an available alternative. */
export function StudentReschedule({ bookingId, timeZone, onSaved }: { bookingId: string; timeZone: string; onSaved?: () => void }) {
  const t = useTranslations("dashboard.lessonDetail");
  const b = useTranslations("booking");
  const locale = useLocale();
  const router = useRouter();
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarViewMode>("day");
  const [anchor, setAnchor] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/bookings/${encodeURIComponent(bookingId)}/reschedule`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(url, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (controller.signal.aborted) return;
      const options: SlotOption[] = Array.isArray(data.slots) ? data.slots.filter((slot: SlotOption) => typeof slot.startsAtIso === "string" && Number.isFinite(Date.parse(slot.startsAtIso))) : [];
      setSlots(options); if (options[0]) setAnchor(options[0].startsAtIso);
    }).catch(() => { /* Without confirmed availability there is no reschedule action. */ });
    return () => controller.abort();
  }, [url]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt: selected }) });
      const data = await response.json();
      if (!response.ok) { setError(data.reason === "LIMIT_REACHED" ? t("rescheduleLimitReached") : data.error ?? t("rescheduleError")); return; }
      router.refresh();
      if (data.calendarUpdated === false) { setError(t("rescheduleCalendarPartial")); setSlots([]); return; }
      setSlots([]); onSaved?.();
    } catch { setError(t("rescheduleError")); }
    finally { setBusy(false); }
  }
  if (!slots.length) return error ? <p role="alert"><Status tone="error">{error}</Status></p> : null;
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>{t("rescheduleTitle")}</Button>;
  return <form onSubmit={event => void submit(event)} className="mt-5 space-y-4 border-t border-border pt-5">
    <h2 className="text-base font-semibold">{t("rescheduleTitle")}</h2>
    <p className="text-sm text-muted">{t("studentRescheduleHelp")} {b("timezoneShownAs")}: {timeZone}</p>
    <SlotSelectionCalendar locale={locale} timeZone={timeZone} slots={slots} compactMonth calendarView={view} onCalendarViewChange={setView}
      calendarAnchor={anchor} onCalendarAnchorChange={setAnchor} selectedStartsAtIso={selected} onSelectSlot={value => { if (!busy) setSelected(value); }}
      copy={{ noAvailabilityYet: b("noAvailabilityYet"), unavailableShort: b("unavailableShort"), calendarDay: b("calendarDay"),
        calendarWeek: b("calendarWeek"), calendarMonth: b("calendarMonth"), previous: b("previous"), next: b("next") }} />
    {error ? <p role="alert"><Status tone="error">{error}</Status></p> : null}
    <Button type="submit" disabled={!selected} loading={busy}>{t("rescheduleSubmit")}</Button>
  </form>;
}
