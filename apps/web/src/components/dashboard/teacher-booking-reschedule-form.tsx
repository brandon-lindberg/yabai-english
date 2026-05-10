"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  initialStartsAtIso: string;
  teacherTimezone: string;
};

export function TeacherBookingRescheduleForm({
  bookingId,
  initialStartsAtIso,
  teacherTimezone,
}: Props) {
  const t = useTranslations("dashboard.lessonDetail");
  const router = useRouter();
  const initialLocal = DateTime.fromISO(initialStartsAtIso, { zone: "utc" }).setZone(
    teacherTimezone,
  );
  const [value, setValue] = useState(initialLocal.toFormat("yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const parsed = DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", {
      zone: teacherTimezone,
    });
    if (!parsed.isValid) {
      setError(t("rescheduleInvalidLocalTime"));
      setLoading(false);
      return;
    }
    const startsAt = parsed.toUTC().toISO();
    if (!startsAt) {
      setError(t("rescheduleInvalidLocalTime"));
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt }),
      });
      const data = (await res.json()) as { error?: string; calendarUpdated?: boolean };
      if (!res.ok) {
        setError(data.error ?? t("rescheduleError"));
        return;
      }
      if (data.calendarUpdated === false) {
        setError(t("rescheduleCalendarPartial"));
      } else {
        setSuccess(true);
      }
      router.refresh();
    } catch {
      setError(t("rescheduleError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-t border-border pt-4">
      <h2 className="text-sm font-semibold text-foreground">{t("rescheduleTitle")}</h2>
      <p className="text-xs text-muted">{t("rescheduleHelp")}</p>
      {error ? (
        <p className="text-xs" style={{ color: "var(--app-danger)" }} role="alert">
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p className="text-xs text-green-700 dark:text-green-400" role="status">
          {t("rescheduleSuccess")}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted">
          {t("rescheduleLabel")}
          <input
            type="datetime-local"
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            disabled={loading}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("rescheduleWorking") : t("rescheduleSubmit")}
        </button>
      </div>
    </form>
  );
}
