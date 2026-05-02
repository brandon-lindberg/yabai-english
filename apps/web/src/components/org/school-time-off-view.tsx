"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type TimeOffRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  teacherMembership?: {
    id: string;
    user: { id: string; name: string | null; image: string | null };
  };
};

type Props = {
  orgId: string;
  schoolId: string;
  canReview: boolean;
  canRequest: boolean;
};

export function SchoolTimeOffView({
  orgId,
  schoolId,
  canReview,
  canRequest,
}: Props) {
  const t = useTranslations("org.school.timeOffPage");
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}/time-off-requests`)
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
  }, [orgId, schoolId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(
      `/api/org/${orgId}/schools/${schoolId}/time-off-requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          reason: reason || undefined,
        }),
      },
    );

    if (!res.ok) {
      setError(t("error"));
      setSaving(false);
      return;
    }

    const { request } = await res.json();
    setRequests((prev) => [request, ...prev]);
    setShowCreate(false);
    setStartDate("");
    setEndDate("");
    setReason("");
    setSaving(false);
  }

  async function handleReview(requestId: string, status: "APPROVED" | "DENIED") {
    const res = await fetch(
      `/api/org/${orgId}/schools/${schoolId}/time-off-requests/${requestId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );

    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r)),
      );
    }
  }

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  const statusColors: Record<string, string> = {
    PENDING: "border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] text-[var(--app-warning-text)]",
    APPROVED: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300",
    DENIED: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div>
      {canRequest && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("request")}
          </button>
        </div>
      )}

      {canRequest && showCreate && (
        <AppCard className="mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("startDate")}
                </label>
                <input
                  type="date"
                  className={inputCn}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("endDate")}
                </label>
                <input
                  type="date"
                  className={inputCn}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("reason")}
              </label>
              <input
                className={inputCn}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reviewNotePlaceholder")}
              />
            </div>
            {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t("submitting") : t("submit")}
            </button>
          </form>
        </AppCard>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-muted">{t("noRequests")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    {r.teacherMembership?.user?.name ?? t("teacher")}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                  </p>
                  {r.reason && <p className="text-xs text-muted">{r.reason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[r.status] ?? ""}`}
                >
                  {t(r.status.toLowerCase() as "pending" | "approved" | "denied")}
                </span>
                {canReview && r.status === "PENDING" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReview(r.id, "APPROVED")}
                      className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {t("approve")}
                    </button>
                    <button
                      onClick={() => handleReview(r.id, "DENIED")}
                      className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {t("deny")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
