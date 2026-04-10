"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  studentId: string;
  currentLevel: "UNSET" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  defaultNeedsReview: boolean;
};

export function AdminPlacementReviewForm({
  studentId,
  currentLevel,
  defaultNeedsReview,
}: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">(
    currentLevel === "UNSET" ? "BEGINNER" : currentLevel,
  );
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setStatus(null);
    const res = await fetch(`/api/admin/students/${studentId}/placement-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placedLevel: level, adminNote: note }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "Failed");
      setSaving(false);
      return;
    }
    setStatus(defaultNeedsReview ? "Reviewed" : "Updated");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={level}
          onChange={(e) =>
            setLevel(e.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
          }
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
        >
          <option value="BEGINNER">BEGINNER</option>
          <option value="INTERMEDIATE">INTERMEDIATE</option>
          <option value="ADVANCED">ADVANCED</option>
        </select>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Review note (optional)"
        className="min-h-14 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  );
}
