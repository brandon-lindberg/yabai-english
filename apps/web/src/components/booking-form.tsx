"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapBookingApiError } from "@/lib/booking-errors";
import { useRouter } from "@/i18n/navigation";
import { canShowManualOverrideToggle } from "@/lib/manual-override";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
type LessonProductOption = {
  id: string;
  nameJa: string;
  nameEn: string;
  durationMin: number;
  tier: string;
};

type Props = {
  teacherProfileId?: string;
  currentUserRole?: "STUDENT" | "TEACHER" | "ADMIN";
  presetSlots?: Array<{
    startsAtIso: string;
    label: string;
  }>;
};

export function BookingForm({
  teacherProfileId,
  currentUserRole = "STUDENT",
  presetSlots,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("booking");
  const router = useRouter();
  const [products, setProducts] = useState<LessonProductOption[]>([]);
  const [lessonProductId, setLessonProductId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(
    presetSlots?.[0]?.startsAtIso ?? new Date().toISOString(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qs = teacherProfileId
      ? `?teacherProfileId=${encodeURIComponent(teacherProfileId)}`
      : "";
    void fetch(`/api/lesson-products${qs}`)
      .then((r) => r.json())
      .then((data: LessonProductOption[]) => {
        setProducts(data);
        if (data[0]) setLessonProductId(data[0].id);
      });
  }, [teacherProfileId]);

  useEffect(() => {
    if (presetSlots && presetSlots.length > 0) {
      setStartsAt(presetSlots[0].startsAtIso);
      setCalendarAnchor(presetSlots[0].startsAtIso);
    }
  }, [presetSlots]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const iso = startsAt ? new Date(startsAt).toISOString() : "";
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId,
          startsAt: iso,
          teacherProfileId,
          manualOverride: canShowManualOverrideToggle(currentUserRole)
            ? manualOverride
            : undefined,
          manualOverrideReason: canShowManualOverrideToggle(currentUserRole)
            ? manualOverrideReason
            : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        checkoutUrl?: string;
      };
      if (!res.ok) {
        if (data.error === "Bookings must be made at least 48 hours in advance.") {
          setMessage(t("leadTimeError"));
        } else if (data.error === "This teacher does not offer a free trial lesson.") {
          setMessage(t("teacherFreeTrialUnavailable"));
        } else if (data.error === "Manual override reason is required.") {
          setMessage(t("manualOverrideReasonError"));
        } else {
          setMessage(mapBookingApiError(data.error ?? "Error"));
        }
        return;
      }
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
        return;
      }
      setMessage(t("success"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <label className="block text-sm font-medium text-foreground">
        {t("selectProduct")}
        <select
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          value={lessonProductId}
          onChange={(e) => setLessonProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nameJa} — {p.durationMin}
              {p.tier === "FREE_TRIAL" ? ` · ${t("freeTrialOption")}` : ""}
            </option>
          ))}
        </select>
      </label>
      {presetSlots ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("selectSlot")}</p>
          {presetSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background px-3 py-2 text-sm text-muted">
              {t("noAvailabilityYet")}
            </p>
          ) : (
            <>
              <div className="mb-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
                {startsAt
                  ? `${t("selectedSlot")}: ${new Date(startsAt).toLocaleString(locale, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : t("noSlotSelected")}
              </div>
              <SlotSelectionCalendar
                locale={locale}
                copy={{
                  noAvailabilityYet: t("noAvailabilityYet"),
                  unavailableShort: t("unavailableShort"),
                  calendarDay: t("calendarDay"),
                  calendarWeek: t("calendarWeek"),
                  calendarMonth: t("calendarMonth"),
                  previous: t("previous"),
                  next: t("next"),
                }}
                slots={presetSlots}
                calendarView={calendarView}
                onCalendarViewChange={setCalendarView}
                calendarAnchor={calendarAnchor}
                onCalendarAnchorChange={setCalendarAnchor}
                selectedStartsAtIso={startsAt || null}
                onSelectSlot={(iso) => {
                  setStartsAt(iso);
                }}
              />
            </>
          )}
        </div>
      ) : (
        <label className="block text-sm font-medium text-foreground">
          {t("selectSlot")}
          <input
            type="datetime-local"
            required
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
      )}
      {canShowManualOverrideToggle(currentUserRole) && (
        <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            <span>
              {t("manualOverrideLabel")}
              <span className="mt-0.5 block text-xs text-muted">
                {t("manualOverrideHelp")}
              </span>
            </span>
          </label>
          {manualOverride && (
            <label className="mt-3 block text-xs text-muted">
              {t("manualOverrideReasonLabel")}
              <textarea
                value={manualOverrideReason}
                onChange={(e) => setManualOverrideReason(e.target.value)}
                className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                placeholder={t("manualOverrideReasonPlaceholder")}
                required
              />
            </label>
          )}
        </div>
      )}
      {message && (
        <p className="text-sm text-link" role="status">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !lessonProductId || !startsAt}
        className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {t("confirm")}
      </button>
    </form>
  );
}
