"use client";

import { useState } from "react";

export function CalendarTokenForm() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calendar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Failed");
        return;
      }
      setStatus("Saved.");
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <label className="block text-sm font-medium text-slate-700">
        Refresh token
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          rows={3}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ya29..."
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        Save token
      </button>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </form>
  );
}
