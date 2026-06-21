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
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1">{copy.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={connectHref}
          className="inline-flex rounded-full bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          {copy.reconnect}
        </a>
        {canRetryInvite ? (
          <button
            type="button"
            disabled={busy}
            onClick={retryInvite}
            className="inline-flex rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          >
            {busy ? copy.retrying : copy.retry}
          </button>
        ) : null}
        <a
          href={googleCalendarHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
        >
          {copy.addToGoogleCalendar}
        </a>
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}
