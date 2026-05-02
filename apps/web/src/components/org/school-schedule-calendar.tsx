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

  const inputCn =
    "w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";
  const selectCn = inputCn;

  const taxonomyMissing =
    !loading && (classLevels.length === 0 || classTypes.length === 0);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={taxonomyMissing}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {t("addSlot")}
        </button>
      </div>

      {taxonomyMissing && (
        <p className="rounded-lg border border-[var(--app-warning,#d97706)]/40 bg-[var(--app-warning,#d97706)]/10 px-3 py-2 text-xs text-foreground">
          {t("taxonomyMissingWarning")}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : (
        <SlotSelectionCalendar
          variant="embedded"
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
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">
                {t("dayOfWeek")}
                <select
                  className={selectCn}
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
                </select>
              </label>
              <label className="text-xs text-muted">
                {t("startTime")}
                <input
                  type="time"
                  className={inputCn}
                  value={toTime(draft.startMin)}
                  onChange={(e) =>
                    setDraft({ ...draft, startMin: parseTime(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs text-muted">
                {t("endTime")}
                <input
                  type="time"
                  className={inputCn}
                  value={toTime(draft.endMin)}
                  onChange={(e) =>
                    setDraft({ ...draft, endMin: parseTime(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">
                {t("duration")}
                <input
                  type="number"
                  className={inputCn}
                  value={draft.durationMin}
                  min={1}
                  onChange={(e) =>
                    setDraft({ ...draft, durationMin: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs text-muted">
                {t("capacity")}
                <input
                  type="number"
                  className={inputCn}
                  value={draft.capacity}
                  min={1}
                  max={100}
                  onChange={(e) =>
                    setDraft({ ...draft, capacity: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                {t("recurrence")}
                <select
                  className={selectCn}
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
                </select>
              </label>
              {draft.recurrence === "ONE_OFF" ? (
                <label className="text-xs text-muted">
                  {t("oneOffDate")}
                  <input
                    type="date"
                    className={inputCn}
                    value={draft.startsOn}
                    onChange={(e) =>
                      setDraft({ ...draft, startsOn: e.target.value })
                    }
                    required
                  />
                </label>
              ) : null}
            </div>

            {draft.recurrence === "WEEKLY" ? (
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-xs text-muted">
                  {t("daysOfWeek")}
                </legend>
                <div className="flex flex-wrap gap-3">
                  {dayOptions.map(({ value, label }) => {
                    const checked = draft.daysOfWeek.includes(value);
                    return (
                      <label
                        key={value}
                        className="inline-flex items-center gap-1 text-xs text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          aria-label={label}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...draft.daysOfWeek, value]
                              : draft.daysOfWeek.filter((x) => x !== value);
                            setDraft({ ...draft, daysOfWeek: next });
                          }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {draft.recurrence !== "ONE_OFF" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  {t("startsOn")}
                  <input
                    type="date"
                    className={inputCn}
                    value={draft.startsOn}
                    onChange={(e) =>
                      setDraft({ ...draft, startsOn: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs text-muted">
                  {t("endsOn")}
                  <input
                    type="date"
                    className={inputCn}
                    value={draft.endsOn}
                    onChange={(e) =>
                      setDraft({ ...draft, endsOn: e.target.value })
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                {t("classLevel")}
                <select
                  className={selectCn}
                  value={draft.classLevelId}
                  required
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
                </select>
                {classLevels.length === 0 ? (
                  <span className="mt-1 block text-[11px] text-muted">
                    {t("noClassLevels")}
                  </span>
                ) : null}
              </label>
              <label className="text-xs text-muted">
                {t("classType")}
                <select
                  className={selectCn}
                  value={draft.classTypeId}
                  required
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
                </select>
                {classTypes.length === 0 ? (
                  <span className="mt-1 block text-[11px] text-muted">
                    {t("noClassTypes")}
                  </span>
                ) : null}
              </label>
            </div>

            {error && (
              <p className="text-sm text-[var(--app-danger)]">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t("creating") : t("create")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
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
