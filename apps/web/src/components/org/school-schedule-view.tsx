"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type Slot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  durationMin: number;
  lessonLevel: string;
  lessonType: string;
  labelJa?: string;
  labelEn?: string;
  capacity: number;
  assignedTeacher?: {
    id: string;
    user: { name: string | null };
  } | null;
  _count?: { enrollments: number };
};

type Props = { orgId: string; schoolId: string };

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function SchoolScheduleView({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.schedulePage");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    startMin: 540,
    endMin: 590,
    durationMin: 50,
    lessonLevel: "beginner",
    lessonType: "conversation",
    capacity: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}/schedule`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []));
  }, [orgId, schoolId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/org/${orgId}/schools/${schoolId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      setError(t("error"));
      setSaving(false);
      return;
    }

    const { slot } = await res.json();
    setSlots((prev) => [...prev, slot]);
    setShowCreate(false);
    setSaving(false);
  }

  async function handleDeactivate(slotId: string) {
    await fetch(`/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}`, {
      method: "DELETE",
    });
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";
  const selectCn =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("addSlot")}
        </button>
      </div>

      {showCreate && (
        <AppCard className="mb-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t("createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("dayOfWeek")}
                </label>
                <select
                  className={selectCn}
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>{t(`days.${d}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("startTime")}
                </label>
                <input
                  type="number"
                  className={inputCn}
                  value={form.startMin}
                  onChange={(e) => setForm({ ...form, startMin: Number(e.target.value) })}
                  min={0}
                  max={1439}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("endTime")}
                </label>
                <input
                  type="number"
                  className={inputCn}
                  value={form.endMin}
                  onChange={(e) => setForm({ ...form, endMin: Number(e.target.value) })}
                  min={1}
                  max={1440}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("duration")}
                </label>
                <input
                  type="number"
                  className={inputCn}
                  value={form.durationMin}
                  onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("lessonLevel")}
                </label>
                <select
                  className={selectCn}
                  value={form.lessonLevel}
                  onChange={(e) => setForm({ ...form, lessonLevel: e.target.value })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("lessonType")}
                </label>
                <select
                  className={selectCn}
                  value={form.lessonType}
                  onChange={(e) => setForm({ ...form, lessonType: e.target.value })}
                >
                  <option value="conversation">Conversation</option>
                  <option value="grammar">Grammar</option>
                  <option value="pronunciation">Pronunciation</option>
                  <option value="reading">Reading</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("capacity")}
              </label>
              <input
                type="number"
                className={inputCn + " max-w-[120px]"}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                min={1}
                max={100}
              />
            </div>

            {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}

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
        </AppCard>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-muted">{t("noSlots")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-6">
                <span className="w-20 font-medium text-foreground">
                  {t(`days.${slot.dayOfWeek}`)}
                </span>
                <span className="text-muted">
                  {fmtMin(slot.startMin)} – {fmtMin(slot.endMin)}
                </span>
                <span className="rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs">
                  {slot.lessonLevel} · {slot.lessonType}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>
                  {slot.assignedTeacher?.user?.name ?? t("unassigned")}
                </span>
                <span>
                  {slot._count?.enrollments ?? 0}/{slot.capacity}
                </span>
                <button
                  onClick={() => handleDeactivate(slot.id)}
                  className="text-[var(--app-danger)] hover:underline"
                >
                  {t("deactivate")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
