"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

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

  const statusColors: Record<string, string> = {
    PENDING: "border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] text-[var(--app-warning-text)]",
    APPROVED: "border-border bg-[var(--app-hover)] text-foreground",
    DENIED: "border-[var(--app-danger)] bg-[var(--app-danger)]/10 text-[var(--app-danger)]",
  };

  return (
    <div>
      {canRequest && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={buttonClasses()}
          >
            {t("request")}
          </button>
        </div>
      )}

      {canRequest && showCreate && (
        <AppCard className="mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            {/*
              These labels had no `htmlFor` and did not wrap their input, so
              nothing connected them: clicking a label did nothing, and a screen
              reader reached three unlabelled boxes. `Field` generates the id and
              ties them together.
            */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("startDate")} required>
                {(field) => (
                  <Input
                    {...field}
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("endDate")} required>
                {(field) => (
                  <Input
                    {...field}
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={t("reason")}>
              {(field) => (
                <Input
                  {...field}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reviewNotePlaceholder")}
                />
              )}
            </Field>
            {error ? (
              <p role="alert">
                <Status tone="error">{error}</Status>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className={buttonClasses()}
            >
              {saving ? t("submitting") : t("submit")}
            </button>
          </form>
        </AppCard>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-muted">{t("noRequests")}</p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
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
                      className={buttonClasses({ size: "sm" })}
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
