"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

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

  /*
    Operator tooling, SUPER_ADMIN only, so the copy stays English rather than
    adding message keys for a screen the Japanese-speaking audience never sees.

    `autoComplete="off"` and `spellCheck={false}` because this field holds a
    credential: nothing here should be offered back by the browser or sent to a
    spell-check service.
  */
  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4 border-t border-border pt-6">
      <Field label="Refresh token">
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ya29..."
            required
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        )}
      </Field>
      <Button type="submit" loading={loading}>
        Save token
      </Button>
      {status ? (
        <p role="status">
          <Status tone={status === "Saved." ? "settled" : "error"}>{status}</Status>
        </p>
      ) : null}
    </form>
  );
}
