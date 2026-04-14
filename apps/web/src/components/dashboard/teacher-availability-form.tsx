"use client";

import { useState } from "react";

type Slot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
};

type Props = {
  initialSlots: Slot[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export function TeacherAvailabilityForm({ initialSlots }: Props) {
  const [slots, setSlots] = useState<Slot[]>(
    initialSlots.length > 0
      ? initialSlots
      : [{ dayOfWeek: 1, startMin: 9 * 60, endMin: 10 * 60, timezone: "Asia/Tokyo" }],
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startMin: 9 * 60, endMin: 10 * 60, timezone: "Asia/Tokyo" }]);
  }

  async function save() {
    setStatus("saving");
    const response = await fetch("/api/teacher/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slots),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Availability</h2>
        <button
          type="button"
          onClick={addSlot}
          className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
        >
          Add slot
        </button>
      </div>

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div key={`slot-${index}`} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-4">
            <label className="text-xs text-muted">
              Day
              <select
                value={slot.dayOfWeek}
                onChange={(e) => updateSlot(index, { dayOfWeek: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              >
                {WEEKDAYS.map((day, dayIndex) => (
                  <option key={day} value={dayIndex}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-muted">
              Start
              <input
                type="time"
                value={toTime(slot.startMin)}
                onChange={(e) => updateSlot(index, { startMin: parseTime(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>

            <label className="text-xs text-muted">
              End
              <input
                type="time"
                value={toTime(slot.endMin)}
                onChange={(e) => updateSlot(index, { endMin: parseTime(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>

            <label className="text-xs text-muted">
              Timezone
              <input
                value={slot.timezone}
                onChange={(e) => updateSlot(index, { timezone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>

            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={() => removeSlot(index)}
                className="text-xs font-medium text-destructive hover:opacity-80"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save availability"}
        </button>
        {status === "saved" ? <span className="text-sm text-green-600 dark:text-green-400">Saved</span> : null}
        {status === "error" ? <span className="text-sm text-destructive">Could not save</span> : null}
      </div>
    </section>
  );
}
