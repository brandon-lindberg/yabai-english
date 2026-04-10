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
      className="mt-4 max-w-xl space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <label className="block text-sm font-medium text-foreground">
        Refresh token
        <textarea
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
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
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        Save token
      </button>
      {status && <p className="text-sm text-muted">{status}</p>}
    </form>
  );
}
