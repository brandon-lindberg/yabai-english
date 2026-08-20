"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";
import {
  expandSchoolSlotOccurrences,
  formatSchoolSlotLabel,
  resolveSchoolSlotTaxonomy,
  type SchoolSlotForOccurrences,
} from "@/lib/school-schedule-occurrences";
import { weekdayLabel } from "@/lib/weekdays";
import { buttonClasses } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Field, Input, Select } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Status } from "@/components/ui/status";

type Taxonomy = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
  sortOrder: number;
  active: boolean;
};

function pickTaxonomyLabel(
  entry: { labelEn: string; labelJa: string | null },
  locale: string,
): string {
  if (locale.toLowerCase().startsWith("ja")) {
    return entry.labelJa ?? entry.labelEn;
  }
  return entry.labelEn;
}

type ScheduleSlot = SchoolSlotForOccurrences & {
  durationMin: number;
  classLevelId: string | null;
  classTypeId: string | null;
  _count?: { enrollments: number };
};

type Props = {
  orgId: string;
  schoolId: string;
};

const HORIZON_DAYS = 28;

function toTime(min: number) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function parseTime(value: string) {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

type RecurrenceValue = "WEEKLY" | "DAILY" | "ONE_OFF";

function newDraft() {
  return {
    dayOfWeek: 1,
    startMin: 540,
    endMin: 600,
    durationMin: 60,
    capacity: 1,
    classLevelId: "",
    classTypeId: "",
    recurrence: "WEEKLY" as RecurrenceValue,
    daysOfWeek: [1] as number[],
    startsOn: "",
    endsOn: "",
  };
}

export function SchoolScheduleCalendar({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.schedulePage");
  const td = useTranslations("dashboard");
  const locale = useLocale();

  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [classLevels, setClassLevels] = useState<Taxonomy[]>([]);
  const [classTypes, setClassTypes] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);

  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date().toISOString());
  const [selectedStartsAtIso, setSelectedStartsAtIso] = useState<string | null>(
    null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(newDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dayOptions = useMemo(
    () => [
      { value: 0, label: t("days.0") },
      { value: 1, label: t("days.1") },
      { value: 2, label: t("days.2") },
      { value: 3, label: t("days.3") },
      { value: 4, label: t("days.4") },
      { value: 5, label: t("days.5") },
      { value: 6, label: t("days.6") },
    ],
    [t],
  );

  useEffect(() => {
    const base = `/api/org/${orgId}/schools/${schoolId}`;
    Promise.all([
      fetch(`${base}/schedule`).then((r) => r.json()),
      fetch(`${base}/class-levels`).then((r) => r.json()),
      fetch(`${base}/class-types`).then((r) => r.json()),
    ])
      .then(([sched, levels, types]) => {
        setSlots(sched.slots ?? []);
        setClassLevels(levels.classLevels ?? []);
        setClassTypes(types.classTypes ?? []);
      })
      .finally(() => setLoading(false));
  }, [orgId, schoolId]);

  const enrollmentBySlotId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of slots) {
      out[s.id] = s._count?.enrollments ?? 0;
    }
    return out;
  }, [slots]);

  const calendarSlots = useMemo(() => {
    const now = new Date();
    const rangeStart = now;
    const rangeEnd = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
    return expandSchoolSlotOccurrences({
      slots,
      rangeStart,
      rangeEnd,
      enrollmentBySlotId,
      formatLabel: (slot, occ) =>
        formatSchoolSlotLabel(
          slot,
          { enrolled: occ.enrolled, capacity: occ.capacity },
          locale,
        ),
    });
  }, [slots, enrollmentBySlotId, locale]);

  const selectedSlot = selectedSlotId
    ? slots.find((s) => s.id === selectedSlotId) ?? null
    : null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!draft.classLevelId || !draft.classTypeId) {
      setSaving(false);
      setError(t("classTaxonomyRequired"));
      return;
    }

    const body: Record<string, unknown> = {
      dayOfWeek: draft.dayOfWeek,
      startMin: draft.startMin,
      endMin: draft.endMin,
      durationMin: draft.durationMin,
      capacity: draft.capacity,
      classLevelId: draft.classLevelId,
      classTypeId: draft.classTypeId,
      recurrence: draft.recurrence,
    };
    if (draft.recurrence === "WEEKLY") {
      body.daysOfWeek = [...draft.daysOfWeek].sort((a, b) => a - b);
    }
    if (draft.startsOn) body.startsOn = draft.startsOn;
    if (draft.endsOn) body.endsOn = draft.endsOn;

    const res = await fetch(
      `/api/org/${orgId}/schools/${schoolId}/schedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);

    if (!res.ok) {
      setError(t("error"));
      return;
    }
    const { slot } = await res.json();
    setSlots((prev) => [...prev, slot]);
    setShowCreate(false);
    setDraft(newDraft());
  }

  async function handleDeactivate(slotId: string) {
    await fetch(
      `/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}`,
      { method: "DELETE" },
    );
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    setSelectedSlotId(null);
    setSelectedStartsAtIso(null);
  }

  const taxonomyMissing =
    !loading && (classLevels.length === 0 || classTypes.length === 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={taxonomyMissing}
          className={buttonClasses()}
        >
          {t("addSlot")}
        </button>
      </div>

      {/* `--app-warning` is not a token — only `--app-warning-bg`, `-border`
          and `-text` exist — so this always fell through to a hardcoded
          amber. */}
      {taxonomyMissing && (
        <InlineAlert variant="warning">{t("taxonomyMissingWarning")}</InlineAlert>
      )}

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : (
        <SlotSelectionCalendar
          locale={locale}
          copy={{
            noAvailabilityYet: t("noSlots"),
            unavailableShort: "—",
            calendarDay: td("calendarDay"),
            calendarWeek: td("calendarWeek"),
            calendarMonth: td("calendarMonth"),
            previous: td("previous"),
            next: td("next"),
          }}
          slots={calendarSlots}
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          calendarAnchor={calendarAnchor}
          onCalendarAnchorChange={setCalendarAnchor}
          selectedStartsAtIso={selectedStartsAtIso}
          selectedGroupKey={selectedSlotId}
          onSelectSlot={(iso, groupKey) => {
            setSelectedStartsAtIso(iso);
            setSelectedSlotId(groupKey ?? null);
          }}
        />
      )}

      {selectedSlot ? (
        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {t("selectedSlot")}
            </p>
            <button
              type="button"
              onClick={() => handleDeactivate(selectedSlot.id)}
              className="text-xs font-medium text-[var(--app-danger)] hover:underline"
            >
              {t("deactivate")}
            </button>
          </div>
          <p className="text-xs text-muted">
            {weekdayLabel(selectedSlot.dayOfWeek, locale)} ·{" "}
            {toTime(selectedSlot.startMin)} – {toTime(selectedSlot.endMin)} ·{" "}
            {(selectedSlot._count?.enrollments ?? 0)}/{selectedSlot.capacity}
          </p>
          {(() => {
            const { level, type } = resolveSchoolSlotTaxonomy(
              selectedSlot,
              locale,
            );
            return (
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted">{t("classLevel")}</dt>
                <dd className="text-foreground">{level || "—"}</dd>
                <dt className="text-muted">{t("classType")}</dt>
                <dd className="text-foreground">{type || "—"}</dd>
              </dl>
            );
          })()}
        </div>
      ) : null}

      {showCreate && (
        /*
          Every control here was a bare `<label className="text-xs text-muted">`
          wrapping its input — implicit association, which works, but a label a
          third smaller and two shades lighter than the labels on every other
          form in the app, with nowhere to hang a hint or an error. `Field` owns
          that wiring, and the empty-taxonomy notices become real hints instead
          of loose spans.
        */
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("dayOfWeek")}>
                {(field) => (
                  <Select
                    {...field}
                    value={draft.dayOfWeek}
                    onChange={(e) =>
                      setDraft({ ...draft, dayOfWeek: Number(e.target.value) })
                    }
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {weekdayLabel(d, locale)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("startTime")}>
                {(field) => (
                  <Input
                    {...field}
                    type="time"
                    value={toTime(draft.startMin)}
                    onChange={(e) =>
                      setDraft({ ...draft, startMin: parseTime(e.target.value) })
                    }
                  />
                )}
              </Field>
              <Field label={t("endTime")}>
                {(field) => (
                  <Input
                    {...field}
                    type="time"
                    value={toTime(draft.endMin)}
                    onChange={(e) =>
                      setDraft({ ...draft, endMin: parseTime(e.target.value) })
                    }
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("duration")}>
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    value={draft.durationMin}
                    onChange={(e) =>
                      setDraft({ ...draft, durationMin: Number(e.target.value) })
                    }
                  />
                )}
              </Field>
              <Field label={t("capacity")}>
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={100}
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft({ ...draft, capacity: Number(e.target.value) })
                    }
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("recurrence")}>
                {(field) => (
                  <Select
                    {...field}
                    value={draft.recurrence}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        recurrence: e.target.value as RecurrenceValue,
                      })
                    }
                  >
                    <option value="WEEKLY">{t("recurrenceWeekly")}</option>
                    <option value="DAILY">{t("recurrenceDaily")}</option>
                    <option value="ONE_OFF">{t("recurrenceOneOff")}</option>
                  </Select>
                )}
              </Field>
              {draft.recurrence === "ONE_OFF" ? (
                <Field label={t("oneOffDate")} required>
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      required
                      value={draft.startsOn}
                      onChange={(e) =>
                        setDraft({ ...draft, startsOn: e.target.value })
                      }
                    />
                  )}
                </Field>
              ) : null}
            </div>

            {draft.recurrence === "WEEKLY" ? (
              <fieldset>
                <legend className="text-sm font-medium text-foreground">
                  {t("daysOfWeek")}
                </legend>
                <div className="mt-1 flex flex-wrap gap-x-5">
                  {dayOptions.map(({ value, label }) => (
                    <CheckRow
                      key={value}
                      checked={draft.daysOfWeek.includes(value)}
                      onChange={(next) =>
                        setDraft({
                          ...draft,
                          daysOfWeek: next
                            ? [...draft.daysOfWeek, value]
                            : draft.daysOfWeek.filter((x) => x !== value),
                        })
                      }
                    >
                      {label}
                    </CheckRow>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {draft.recurrence !== "ONE_OFF" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("startsOn")}>
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      value={draft.startsOn}
                      onChange={(e) =>
                        setDraft({ ...draft, startsOn: e.target.value })
                      }
                    />
                  )}
                </Field>
                <Field label={t("endsOn")}>
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      value={draft.endsOn}
                      onChange={(e) =>
                        setDraft({ ...draft, endsOn: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("classLevel")}
                required
                hint={classLevels.length === 0 ? t("noClassLevels") : null}
              >
                {(field) => (
                  <Select
                    {...field}
                    required
                    value={draft.classLevelId}
                    onChange={(e) =>
                      setDraft({ ...draft, classLevelId: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      {t("classLevelPlaceholder")}
                    </option>
                    {classLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {pickTaxonomyLabel(lvl, locale)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label={t("classType")}
                required
                hint={classTypes.length === 0 ? t("noClassTypes") : null}
              >
                {(field) => (
                  <Select
                    {...field}
                    required
                    value={draft.classTypeId}
                    onChange={(e) =>
                      setDraft({ ...draft, classTypeId: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      {t("classTypePlaceholder")}
                    </option>
                    {classTypes.map((ty) => (
                      <option key={ty.id} value={ty.id}>
                        {pickTaxonomyLabel(ty, locale)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {error ? (
              <p role="alert">
                <Status tone="error">{error}</Status>
              </p>
            ) : null}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className={buttonClasses()}>
                {saving ? t("creating") : t("create")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
