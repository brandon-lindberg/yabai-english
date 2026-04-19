"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapBookingApiError } from "@/lib/booking-errors";
import { useRouter } from "@/i18n/navigation";
import { canShowManualOverrideToggle } from "@/lib/manual-override";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ALL_LESSON_TYPES_KEY,
  filterSlotsForSelection,
  slotMatchesProduct,
} from "@/lib/booking-lesson-type-filter";

type LessonProductOption = {
  id: string;
  nameJa: string;
  nameEn: string;
  durationMin: number;
  tier: string;
  teacherLessonOfferingId?: string | null;
  teacherLessonType?: string | null;
  teacherLessonTypeCustom?: string | null;
  teacherRateYen?: number | null;
  teacherGroupSize?: number | null;
  teacherIsGroupOffer?: boolean;
};

type Props = {
  teacherProfileId?: string;
  currentUserRole?: "STUDENT" | "TEACHER" | "ADMIN";
  presetSlots?: Array<{
    startsAtIso: string;
    endsAtIso?: string;
    label: string;
    groupKey?: string;
    /** Lesson type key from the teacher's availability slot (used to filter). */
    lessonType?: string;
    lessonTypeCustom?: string | null;
  }>;
  /**
   * Slots that other students have already booked. Rendered as non-interactive
   * "Reserved" markers on the calendar. Pass only timing info — never student
   * identities — so nothing leaks to other students viewing the booking page.
   */
  bookedSlots?: Array<{
    startsAtIso: string;
    endsAtIso: string;
  }>;
};


export function BookingForm({
  teacherProfileId,
  currentUserRole = "STUDENT",
  presetSlots,
  bookedSlots,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("booking");
  const tSlotMeta = useTranslations("lessonSlotMeta");
  const router = useRouter();
  const [products, setProducts] = useState<LessonProductOption[]>([]);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>(ALL_LESSON_TYPES_KEY);
  const [startsAt, setStartsAt] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(
    presetSlots?.[0]?.startsAtIso ?? new Date().toISOString(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const qs = teacherProfileId
      ? `?teacherProfileId=${encodeURIComponent(teacherProfileId)}`
      : "";
    setProductsLoading(true);
    void fetch(`/api/lesson-products${qs}`)
      .then((r) => r.json())
      .then((data: LessonProductOption[]) => {
        setProducts(data);
      })
      .finally(() => setProductsLoading(false));
  }, [teacherProfileId]);

  useEffect(() => {
    if (presetSlots && presetSlots.length > 0) {
      setStartsAt(presetSlots[0].startsAtIso);
      setCalendarAnchor(presetSlots[0].startsAtIso);
    }
  }, [presetSlots]);

  const selectedOption =
    selectedOptionKey === ALL_LESSON_TYPES_KEY
      ? undefined
      : products.find((p) => optionKey(p) === selectedOptionKey);

  /** When "All lesson types" is selected, infer the catalog row from the chosen slot. */
  const resolvedProductForAllTypes = useMemo(() => {
    if (selectedOptionKey !== ALL_LESSON_TYPES_KEY || !startsAt || !presetSlots?.length) {
      return undefined;
    }
    const slot = presetSlots.find((s) => s.startsAtIso === startsAt);
    if (!slot) return undefined;
    const candidates = products.filter((p) => slotMatchesProduct(slot, p));
    if (candidates.length === 0) return undefined;
    if (slot.endsAtIso) {
      const durMin = Math.round(
        (new Date(slot.endsAtIso).getTime() - new Date(slot.startsAtIso).getTime()) / 60_000,
      );
      const byDuration = candidates.filter((p) => p.durationMin === durMin);
      if (byDuration.length >= 1) return byDuration[0];
    }
    return candidates[0];
  }, [selectedOptionKey, startsAt, presetSlots, products]);

  const effectiveProduct = selectedOption ?? resolvedProductForAllTypes;

  const bookedStartsAtSet = useMemo(
    () => new Set((bookedSlots ?? []).map((b) => b.startsAtIso)),
    [bookedSlots],
  );

  const filteredPresetSlots = useMemo(() => {
    if (!presetSlots) return presetSlots;
    const availability = filterSlotsForSelection(presetSlots, selectedOption).filter(
      (s) => !bookedStartsAtSet.has(s.startsAtIso),
    );
    const reservedMarkers = (bookedSlots ?? []).map((b) => ({
      startsAtIso: b.startsAtIso,
      endsAtIso: b.endsAtIso,
      label: t("reserved"),
      kind: "booked" as const,
    }));
    return [...availability, ...reservedMarkers].sort((a, b) =>
      a.startsAtIso.localeCompare(b.startsAtIso),
    );
  }, [presetSlots, selectedOption, bookedSlots, bookedStartsAtSet, t]);

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
          lessonProductId: effectiveProduct?.id ?? "",
          teacherLessonOfferingId: effectiveProduct?.teacherLessonOfferingId ?? undefined,
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
        {productsLoading ? (
          <div
            data-testid="booking-products-loading"
            aria-busy="true"
            className="mt-1 space-y-2"
          >
            <Skeleton height="10" rounded="lg" />
            <Skeleton height="3" width="1/3" />
          </div>
        ) : (
          <select
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
            value={selectedOptionKey}
            onChange={(e) => {
              setSelectedOptionKey(e.target.value);
              setStartsAt("");
            }}
          >
            <option value={ALL_LESSON_TYPES_KEY}>{t("allLessonTypes")}</option>
            {products.map((p) => (
              <option key={optionKey(p)} value={optionKey(p)}>
                {buildProductOptionLabel(p, tSlotMeta, t)} — {p.durationMin}
                {p.tier === "FREE_TRIAL" ? ` · ${t("freeTrialOption")}` : ""}
              </option>
            ))}
          </select>
        )}
      </label>
      {filteredPresetSlots ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("selectSlot")}</p>
          {filteredPresetSlots.length === 0 ? (
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
                slots={filteredPresetSlots}
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
        disabled={loading || productsLoading || !startsAt || !effectiveProduct}
        className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {t("confirm")}
      </button>
    </form>
  );
}

function optionKey(p: LessonProductOption): string {
  return `${p.id}::${p.teacherLessonOfferingId ?? ""}`;
}

function buildProductOptionLabel(
  p: LessonProductOption,
  tSlotMeta: (key: string) => string,
  tBooking: (key: string, values?: Record<string, string | number>) => string,
): string {
  const lessonType =
    p.teacherLessonType === "custom"
      ? (p.teacherLessonTypeCustom ?? "").trim() || tSlotMeta("types.custom")
      : p.teacherLessonType
        ? tSlotMeta(`types.${p.teacherLessonType}`)
        : null;
  const groupLabel =
    p.teacherIsGroupOffer && p.teacherGroupSize
      ? ` / ${tBooking("groupPeopleLabel", { count: p.teacherGroupSize })}`
      : "";
  if (!lessonType) {
    return `${p.nameJa}${groupLabel}`;
  }
  return `${p.nameJa} (${lessonType}${groupLabel})`;
}
