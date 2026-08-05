"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  googleCalendarHref: string;
  connectHref: string;
  canRetryInvite: boolean;
  copy: {
    title: string;
    body: string;
    reconnect: string;
    retry: string;
    retrying: string;
    retrySuccess: string;
    retryError: string;
    addToGoogleCalendar: string;
  };
};

export function BookingCalendarRecoveryActions({
  bookingId,
  googleCalendarHref,
  connectHref,
  canRetryInvite,
  copy,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retryInvite() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/calendar/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        setMessage(data?.message ?? data?.error ?? copy.retryError);
        return;
      }
      setMessage(copy.retrySuccess);
      router.refresh();
    } catch {
      setMessage(copy.retryError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--app-warn-border)] bg-[var(--app-warn-bg)] p-3 text-sm text-[var(--app-warn-text)]">
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1">{copy.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={connectHref}
          className="inline-flex min-h-9 items-center rounded-full bg-[var(--app-warn-text)] px-3 py-1.5 text-xs font-semibold text-[var(--storm-paper)] hover:opacity-90"
        >
          {copy.reconnect}
        </a>
        {canRetryInvite ? (
          <button
            type="button"
            disabled={busy}
            onClick={retryInvite}
            className="inline-flex min-h-9 items-center rounded-full border border-[var(--app-warn-border)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--app-warn-text)] hover:bg-[var(--app-warn-bg)] disabled:opacity-60"
          >
            {busy ? copy.retrying : copy.retry}
          </button>
        ) : null}
        <a
          href={googleCalendarHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-full border border-[var(--app-warn-border)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--app-warn-text)] hover:bg-[var(--app-warn-bg)]"
        >
          {copy.addToGoogleCalendar}
        </a>
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}
