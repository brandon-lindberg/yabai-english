"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapBookingApiError } from "@/lib/booking-errors";
import { useRouter } from "@/i18n/navigation";
import { canShowManualOverrideToggle } from "@/lib/manual-override";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Status } from "@/components/ui/status";
import {
  ALL_LESSON_TYPES_KEY,
  filterSlotsForSelection,
  slotMatchesProduct,
} from "@/lib/booking-lesson-type-filter";
import { timeRangesOverlap } from "@/lib/teacher-availability-display";

type LessonProductOption = {
  id: string;
  nameJa: string;
  nameEn: string;
  durationMin: number;
  tier: string;
  teacherLessonOfferingId?: string | null;
  teacherClassTypeId?: string | null;
  teacherClassTypeCode?: string | null;
  teacherClassTypeLabelEn?: string | null;
  teacherClassTypeLabelJa?: string | null;
  teacherRateYen?: number | null;
  teacherGroupSize?: number | null;
  teacherIsGroupOffer?: boolean;
  paymentMethods?: Array<{
    accountId: string;
    provider: "STRIPE" | "KOMOJU";
    method: "CARD" | "PAYPAY";
    label: string;
    logoLabel: string;
    logoClassName: string;
  }>;
};

type Props = {
  teacherProfileId?: string;
  currentUserRole?: "STUDENT" | "TEACHER" | "SUPER_ADMIN";
  /** IANA timezone for the viewer selecting a slot. */
  viewerTimezone?: string;
  presetSlots?: Array<{
    startsAtIso: string;
    endsAtIso?: string;
    label: string;
    groupKey?: string;
    classTypeId?: string | null;
  }>;
  bookedSlots?: Array<{
    startsAtIso: string;
    endsAtIso: string;
  }>;
};

export function BookingForm({
  teacherProfileId,
  currentUserRole = "STUDENT",
  viewerTimezone,
  presetSlots,
  bookedSlots,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("booking");
  const router = useRouter();
  const [products, setProducts] = useState<LessonProductOption[]>([]);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>(ALL_LESSON_TYPES_KEY);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(
    presetSlots?.[0]?.startsAtIso ?? new Date().toISOString(),
  );
  /**
   * Errors used to render in the link colour, which read as "here is something
   * to click" rather than "this did not work". Tone is carried alongside the
   * text so the status ladder can say which of the two it is.
   */
  const [message, setMessage] = useState<{ text: string; tone: "error" | "settled" } | null>(null);
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
      setCalendarAnchor(presetSlots[0].startsAtIso);
    }
  }, [presetSlots]);

  const selectedSlot = presetSlots?.find((slot) => slot.startsAtIso === startsAt);
  const productsForSelectedSlot = useMemo(() => {
    if (!selectedSlot) return products;
    return products.filter((product) => slotMatchesProduct(selectedSlot, product));
  }, [products, selectedSlot]);

  const selectedOption =
    selectedOptionKey === ALL_LESSON_TYPES_KEY
      ? undefined
      : products.find((p) => optionKey(p) === selectedOptionKey);

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
  const availablePaymentMethods = useMemo(
    () => effectiveProduct?.paymentMethods ?? [],
    [effectiveProduct],
  );
  const selectedPaymentMethod =
    availablePaymentMethods.find((m) => paymentKey(m) === selectedPaymentKey) ??
    availablePaymentMethods[0];

  useEffect(() => {
    if (availablePaymentMethods.length === 0) {
      if (selectedPaymentKey) setSelectedPaymentKey("");
      return;
    }
    if (!selectedPaymentKey || !availablePaymentMethods.some((m) => paymentKey(m) === selectedPaymentKey)) {
      setSelectedPaymentKey(paymentKey(availablePaymentMethods[0]));
    }
  }, [availablePaymentMethods, selectedPaymentKey]);

  const filteredPresetSlots = useMemo(() => {
    if (!presetSlots) return presetSlots;
    const availability = filterSlotsForSelection(presetSlots, selectedOption).filter(
      (s) =>
        !(bookedSlots ?? []).some((booking) => {
          if (booking.startsAtIso === s.startsAtIso) return true;
          if (!s.endsAtIso) return false;
          return timeRangesOverlap(
            { startsAtIso: s.startsAtIso, endsAtIso: s.endsAtIso },
            booking,
          );
        }),
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
  }, [presetSlots, selectedOption, bookedSlots, t]);

  useEffect(() => {
    if (!filteredPresetSlots || !startsAt) return;
    const isSelectedBookable = filteredPresetSlots.some(
      (slot) => !("kind" in slot && slot.kind === "booked") && slot.startsAtIso === startsAt,
    );
    if (!isSelectedBookable) setStartsAt("");
  }, [filteredPresetSlots, startsAt]);

  const lessonStepDisabled = !startsAt;
  const paymentStepDisabled = !effectiveProduct;
  const formattedSelectedSlot = startsAt
    ? new Date(startsAt).toLocaleString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: viewerTimezone,
      })
    : null;

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
          paymentAccountId: selectedPaymentMethod?.accountId,
          paymentProvider: selectedPaymentMethod?.provider,
          paymentMethod: selectedPaymentMethod?.method,
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
        const fail = (text: string) => setMessage({ text, tone: "error" });
        if (data.error === "Bookings must be made at least 48 hours in advance.") {
          fail(t("leadTimeError"));
        } else if (data.error === "This teacher does not offer a free trial lesson.") {
          fail(t("teacherFreeTrialUnavailable"));
        } else if (data.error === "Manual override reason is required.") {
          fail(t("manualOverrideReasonError"));
        } else if (data.error === "The selected time is not available.") {
          fail(t("slotUnavailableError"));
        } else if (data.error === "The lesson duration does not fit in the selected time slot.") {
          fail(t("durationMismatchError"));
        } else {
          fail(mapBookingApiError(data.error ?? "Error"));
        }
        return;
      }
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
        return;
      }
      setMessage({ text: t("success"), tone: "settled" });
    } finally {
      setLoading(false);
    }
  }

  return (
    /* No card around the form: it is the page's whole purpose, so a border
       around it only says "this is a thing on a page" — which the page already
       says. The steps are ruled instead, so the flow reads as a sequence. */
    <form onSubmit={onSubmit} className="space-y-8">
      {filteredPresetSlots ? (
        <Section
          index={1}
          title={t("stepChooseTimeTitle")}
          description={t("leadTimeNotice")}
          ruled={false}
        >
          {filteredPresetSlots.length === 0 ? (
            <p className="border-y border-border py-6 text-center text-sm text-muted">
              {t("noAvailabilityYet")}
            </p>
          ) : (
            <>
              {/* The chosen time is the fact the rest of the form depends on, so
                  it lands at figure scale — but only once it is real. An empty
                  placeholder at that size would out-shout the step's own
                  heading while saying nothing. */}
              <p className="mb-6 border-b border-border pb-4">
                <span className="block text-sm text-muted">{t("selectedSlot")}</span>
                {formattedSelectedSlot ? (
                  <span className="mt-1 block text-xl font-black tracking-[-0.02em] tabular-nums text-foreground sm:text-2xl">
                    {formattedSelectedSlot}
                  </span>
                ) : (
                  <span className="mt-1 block text-muted">{t("noSlotSelected")}</span>
                )}
              </p>
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
                  setSelectedOptionKey(ALL_LESSON_TYPES_KEY);
                }}
                timeZone={viewerTimezone}
              />
            </>
          )}
        </Section>
      ) : (
        <Section index={1} title={t("stepChooseTimeTitle")} ruled={false}>
          <Field label={t("selectSlot")}>
            {(field) => (
              <Input
                {...field}
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            )}
          </Field>
        </Section>
      )}

      <Section
        index={2}
        title={t("stepChooseLessonTitle")}
        description={lessonStepDisabled ? t("stepChooseLessonHint") : undefined}
        disabled={lessonStepDisabled}
      >
        {productsLoading ? (
          <div data-testid="booking-products-loading" aria-busy="true" className="space-y-2">
            <Skeleton height="10" rounded="lg" />
            <Skeleton height="3" width="1/3" />
          </div>
        ) : (
          <Select
            aria-label={t("selectProduct")}
            value={selectedOptionKey}
            disabled={lessonStepDisabled}
            onChange={(e) => setSelectedOptionKey(e.target.value)}
          >
            <option value={ALL_LESSON_TYPES_KEY}>{t("allLessonTypes")}</option>
            {productsForSelectedSlot.map((p) => (
              <option key={optionKey(p)} value={optionKey(p)}>
                {buildProductOptionLabel(p, locale, t)} — {p.durationMin}
                {p.tier === "FREE_TRIAL" ? ` · ${t("freeTrialOption")}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Section>

      {availablePaymentMethods.length > 0 ? (
        <Section index={3} title={t("stepChoosePaymentTitle")} disabled={paymentStepDisabled}>
          <fieldset className="space-y-2" disabled={paymentStepDisabled}>
            <legend className="sr-only">{t("paymentMethod")}</legend>
            <div className="flex flex-wrap gap-2">
              {availablePaymentMethods.map((method) => {
                const key = paymentKey(method);
                const selected = selectedPaymentKey === key;
                return (
                  <label
                    key={key}
                    /* Selection is a ring in ink, the same mark the slot picker
                       uses — not a tinted fill, which was the only place in the
                       flow where "chosen" was said with colour. */
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                      selected
                        ? "border-foreground text-foreground ring-2 ring-foreground"
                        : "border-border text-muted hover:bg-[var(--app-hover)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={key}
                      checked={selected}
                      onChange={() => setSelectedPaymentKey(key)}
                      className="sr-only"
                      disabled={paymentStepDisabled}
                    />
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${method.logoClassName}`}>
                      {method.logoLabel}
                    </span>
                    <span>{method.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Section>
      ) : null}

      <Section
        index={availablePaymentMethods.length > 0 ? 4 : 3}
        title={t("stepReviewTitle")}
        disabled={!startsAt || !effectiveProduct}
      >
        {/* The same ruled key/value list the checkout summary uses, so the last
            thing you read before booking matches the first thing you read after. */}
        <dl className="border-t border-border text-sm">
          <div className="flex justify-between gap-6 border-b border-border py-3">
            <dt className="text-muted">{t("selectSlot")}</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {formattedSelectedSlot ?? t("noSlotSelected")}
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-border py-3">
            <dt className="text-muted">{t("selectProduct")}</dt>
            <dd className="text-right font-medium text-foreground">
              {effectiveProduct
                ? buildProductOptionLabel(effectiveProduct, locale, t)
                : t("stepChooseLessonHint")}
            </dd>
          </div>
          {selectedPaymentMethod ? (
            <div className="flex justify-between gap-6 border-b border-border py-3">
              <dt className="text-muted">{t("paymentMethod")}</dt>
              <dd className="text-right font-medium text-foreground">
                {selectedPaymentMethod.label}
              </dd>
            </div>
          ) : null}
        </dl>
      </Section>

      {canShowManualOverrideToggle(currentUserRole) && (
        /* Staff-only escape hatch. It stays an inset panel because it genuinely
           sits apart from the student's flow rather than in sequence with it. */
        <div className="rounded-xl border border-border px-4 py-3 text-sm text-foreground">
          <CheckRow
            checked={manualOverride}
            onChange={setManualOverride}
            description={t("manualOverrideHelp")}
          >
            {t("manualOverrideLabel")}
          </CheckRow>
          {manualOverride && (
            <Field label={t("manualOverrideReasonLabel")} className="mt-3">
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  value={manualOverrideReason}
                  onChange={(e) => setManualOverrideReason(e.target.value)}
                  placeholder={t("manualOverrideReasonPlaceholder")}
                  required
                />
              )}
            </Field>
          )}
        </div>
      )}
      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"}>
          <Status tone={message.tone}>{message.text}</Status>
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={loading}
        disabled={productsLoading || !startsAt || !effectiveProduct}
      >
        {t("confirm")}
      </Button>
    </form>
  );
}

function optionKey(p: LessonProductOption): string {
  return `${p.id}::${p.teacherLessonOfferingId ?? ""}`;
}

function paymentKey(method: {
  accountId: string;
  provider: string;
  method: string;
}): string {
  return `${method.accountId}:${method.provider}:${method.method}`;
}

function buildProductOptionLabel(
  p: LessonProductOption,
  locale: string,
  tBooking: (key: string, values?: Record<string, string | number>) => string,
): string {
  const isJa = locale.toLowerCase().startsWith("ja");
  const lessonType =
    p.teacherClassTypeLabelEn || p.teacherClassTypeLabelJa
      ? isJa
        ? (p.teacherClassTypeLabelJa ?? p.teacherClassTypeLabelEn)
        : p.teacherClassTypeLabelEn
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
