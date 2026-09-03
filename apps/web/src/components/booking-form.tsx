"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapBookingApiError } from "@/lib/booking-errors";
import { useRouter } from "@/i18n/navigation";
import { canShowManualOverrideToggle } from "@/lib/manual-override";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
import { Section } from "@/components/ui/section";
import { Modal } from "@/components/ui/modal";
import { useIsWideScreen } from "@/hooks/use-is-wide-screen";
import { formatYen } from "@/lib/format-money";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Field, Input } from "@/components/ui/field";
import { MarkdownField } from "@/components/ui/markdown-field";
import { Status } from "@/components/ui/status";
import { slotMatchesProduct } from "@/lib/booking-lesson-type-filter";
import { occurrenceBookability } from "@/lib/occurrence-bookability";
import type { EnabledTeacherPaymentMethod } from "@/lib/payment-methods";

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
  paymentMethods?: EnabledTeacherPaymentMethod[];
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
    /**
     * Capacity for a group class, and how much of it is spoken for. Aggregate
     * counts only — who is in the class is never sent to another student.
     * Null or absent for a private lesson.
     */
    seats?: { capacity: number; taken: number } | null;
  }>;
  bookedSlots?: Array<{
    startsAtIso: string;
    endsAtIso: string;
    /** The viewer's own unpaid hold, shown as theirs rather than as taken. */
    mine?: boolean;
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
  const [selectedPaymentKey, setSelectedPaymentKey] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  /*
    A month is what a person wants when they have the room for it: it shows
    every time this teacher offers, so choosing is comparing rather than paging
    week by week. Null means "not chosen", so the default follows the viewport
    until the student picks a view, and stays put once they have.
  */
  const isWideScreen = useIsWideScreen();
  const [chosenCalendarView, setCalendarView] = useState<CalendarViewMode | null>(null);
  const calendarView = chosenCalendarView ?? (isWideScreen ? "month" : "week");
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

  const selectedSlotSeats =
    presetSlots?.find((slot) => slot.startsAtIso === startsAt)?.seats ?? null;

  /**
   * The lesson this time IS.
   *
   * A slot carries its own offering — level, focus, length and price — so once
   * a time is picked there is nothing left to choose. This used to be a picker
   * listing every catalog product matching the slot's class type and length,
   * which asked the student to decide something the teacher had already
   * decided, inside a dialog they had opened by choosing that very lesson.
   */
  const effectiveProduct = useMemo(() => {
    if (!startsAt || !presetSlots?.length) {
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
  }, [startsAt, presetSlots, products]);
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
    const blocking = bookedSlots ?? [];
    const availability = [];

    for (const s of presetSlots) {
      // A slot with no end is treated as an instant, so only an exact match
      // counts against it — the behaviour before seats existed.
      const exactClash =
        !s.endsAtIso && blocking.some((b) => b.startsAtIso === s.startsAtIso);
      const bookability = exactClash
        ? ({ state: "taken", seats: null } as const)
        : occurrenceBookability({
            occurrence: {
              startsAtIso: s.startsAtIso,
              endsAtIso: s.endsAtIso ?? s.startsAtIso,
            },
            seats: s.seats ?? null,
            blocking,
          });

      // A private lesson already has a reserved marker built below; adding the
      // slot again would list the same time twice.
      if (bookability.state === "taken") continue;

      if (bookability.state === "full") {
        availability.push({
          ...s,
          label: `${s.label} · ${t("classFull")}`,
          badge: `${t("slotGroup")} · ${t("classFullShort")}`,
          kind: "booked" as const,
        });
        continue;
      }

      // Every slot says which kind of lesson it is. A seat count alone only
      // told you about group classes, so a private lesson was identified by
      // the absence of something — which is not something you can notice.
      availability.push({
        ...s,
        badge: bookability.seats
          ? `${t("slotGroup")} · ${t("seatsLeftShort", { count: bookability.seats.remaining })}`
          : t("slotPrivate"),
      });
    }

    const reservedMarkers = blocking.map((b) => ({
      startsAtIso: b.startsAtIso,
      endsAtIso: b.endsAtIso,
      label: b.mine ? t("yourReservation") : t("reserved"),
      kind: "booked" as const,
    }));
    return [...availability, ...reservedMarkers].sort((a, b) =>
      a.startsAtIso.localeCompare(b.startsAtIso),
    );
  }, [presetSlots, bookedSlots, t]);

  useEffect(() => {
    if (!filteredPresetSlots || !startsAt) return;
    const isSelectedBookable = filteredPresetSlots.some(
      (slot) => !("kind" in slot && slot.kind === "booked") && slot.startsAtIso === startsAt,
    );
    if (!isSelectedBookable) setStartsAt("");
  }, [filteredPresetSlots, startsAt]);
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

  async function onSubmit() {
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
    /* The calendar is the page. Choosing a lesson, reviewing it and paying
       are decisions about one particular time, so they live in a dialog that
       opens when a time is picked rather than as steps below the fold. */
    <>
      {filteredPresetSlots ? (
        <Section title={t("stepChooseTimeTitle")} ruled={false}>
          {filteredPresetSlots.length === 0 ? (
            <p className="border-y border-border py-6 text-center text-sm text-muted">
              {t("noAvailabilityYet")}
            </p>
          ) : (
            <>
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
                timeZone={viewerTimezone}
              />
            </>
          )}
        </Section>
      ) : (
        <Section title={t("stepChooseTimeTitle")} ruled={false}>
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


      {/* Mounted only once a time is picked: a closed dialog still leaves its
          fields and headings in the page for anything reading the document. */}
      {startsAt ? (
      <Modal
        open
        onClose={() => setStartsAt("")}
        title={t("bookingModalTitle")}
        description={formattedSelectedSlot}
        actions={
          <>
            <Button variant="secondary" onClick={() => setStartsAt("")} disabled={loading}>
              {t("bookingModalCancel")}
            </Button>
            <Button
              onClick={onSubmit}
              loading={loading}
              disabled={productsLoading || !effectiveProduct}
            >
              {t("confirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-6">

          {availablePaymentMethods.length > 0 ? (
            <Section title={t("stepChoosePaymentTitle")} disabled={paymentStepDisabled}>
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
            title={t("stepReviewTitle")}
            disabled={!startsAt || !effectiveProduct}
          >
            {/* The same ruled key/value list the checkout summary uses, so the last
                thing you read before booking matches the first thing you read after. */}
            {/*
              Everything the student is agreeing to, in one place. It used to
              say only the time, the lesson name and the card — never the price,
              which is the one number a person needs before they commit.
            */}
            <dl className="border-t border-border text-sm">
              <ReviewRow label={t("reviewDateTime")} figure>
                {formattedSelectedSlot ?? t("noSlotSelected")}
              </ReviewRow>
              <ReviewRow label={t("selectProduct")}>
                {effectiveProduct
                  ? buildProductOptionLabel(effectiveProduct, locale, t)
                  : t("stepChooseLessonHint")}
              </ReviewRow>
              {effectiveProduct ? (
                <ReviewRow label={t("reviewDuration")} figure>
                  {t("reviewDurationValue", { count: effectiveProduct.durationMin })}
                </ReviewRow>
              ) : null}
              {selectedSlotSeats ? (
                <ReviewRow label={t("reviewSeats")} figure>
                  {t("reviewSeatsValue", {
                    taken: selectedSlotSeats.taken,
                    capacity: selectedSlotSeats.capacity,
                  })}
                </ReviewRow>
              ) : null}
              {typeof effectiveProduct?.teacherRateYen === "number" ? (
                <ReviewRow label={t("reviewPrice")} figure>
                  {formatYen(effectiveProduct.teacherRateYen, locale)}{" "}
                  <span className="font-normal text-muted">
                    ({t("reviewPriceTaxNote")})
                  </span>
                </ReviewRow>
              ) : null}
              {selectedPaymentMethod ? (
                <ReviewRow label={t("paymentMethod")}>
                  {selectedPaymentMethod.label}
                </ReviewRow>
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
                <MarkdownField
                  label={t("manualOverrideReasonLabel")}
                  className="mt-3"
                  value={manualOverrideReason}
                  placeholder={t("manualOverrideReasonPlaceholder")}
                  required
                  tone="background"
                  size="sm"
                  minHeightClass="[&_.mdxeditor-root-contenteditable]:min-h-[96px]"
                  onChange={setManualOverrideReason}
                />
              )}
            </div>
          )}
          {message ? (
            <p role={message.tone === "error" ? "alert" : "status"}>
              <Status tone={message.tone}>{message.text}</Status>
            </p>
          ) : null}

        </div>
      </Modal>
      ) : null}
    </>
  );
}


function paymentKey(method: {
  accountId: string;
  provider: string;
  method: string;
}): string {
  return `${method.accountId}:${method.provider}:${method.method}`;
}

/** One line of the summary: what it is on the left, what it says on the right. */
function ReviewRow({
  label,
  figure = false,
  children,
}: {
  label: string;
  /** Figures line up in a column, so they take tabular numerals. */
  figure?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-6 border-b border-border py-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-right font-medium text-foreground${figure ? " tabular-nums" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
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
