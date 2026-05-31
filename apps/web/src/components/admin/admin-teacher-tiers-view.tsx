"use client";

import { useState } from "react";
import type { TeacherPlatformTier } from "@/generated/prisma/browser";

export type AdminTeacherTierRow = {
  teacherId: string;
  name: string;
  email: string | null;
  calculatedTier: TeacherPlatformTier;
  effectiveTier: TeacherPlatformTier;
  overrideTier: TeacherPlatformTier | null;
  overrideExpiresAt: string | null;
  nextQuarterlyReviewAt: string | null;
  pendingEvaluationId: string | null;
};

type Props = {
  rows: AdminTeacherTierRow[];
};

function tierLabel(tier: TeacherPlatformTier) {
  return tier.replace("TIER_", "Tier ");
}

export function AdminTeacherTiersView({ rows }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [legacyTeacherId, setLegacyTeacherId] = useState(rows[0]?.teacherId ?? "");
  const [legacyStudentId, setLegacyStudentId] = useState("");
  const [legacyOfferingId, setLegacyOfferingId] = useState("");
  const [legacyRateYen, setLegacyRateYen] = useState("2500");

  async function evaluate(teacherId: string) {
    setBusyId(teacherId);
    await fetch("/api/admin/teacher-tiers/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    });
    window.location.reload();
  }

  async function setOverride(teacherId: string, tier: TeacherPlatformTier) {
    setBusyId(teacherId);
    await fetch(`/api/admin/teacher-tiers/${teacherId}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    window.location.reload();
  }

  async function removeOverride(teacherId: string) {
    setBusyId(teacherId);
    await fetch(`/api/admin/teacher-tiers/${teacherId}/override`, { method: "DELETE" });
    window.location.reload();
  }

  async function decideEvaluation(id: string, action: "approve-demotion" | "keep-tier") {
    setBusyId(id);
    await fetch(`/api/admin/teacher-tiers/evaluations/${id}/${action}`, { method: "POST" });
    window.location.reload();
  }

  async function saveLegacyRate() {
    setBusyId("legacy-rate");
    await fetch("/api/admin/teacher-student-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: legacyTeacherId,
        studentId: legacyStudentId,
        teacherLessonOfferingId: legacyOfferingId,
        rateYen: Number(legacyRateYen),
        active: true,
      }),
    });
    setBusyId(null);
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-semibold text-foreground">Legacy student rate override</h2>
        <p className="mt-1 text-sm text-muted">
          SUPER_ADMIN-only. Use this for student-specific rates below the public ¥3,000 minimum.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <label className="text-xs text-muted">
            Teacher
            <select
              value={legacyTeacherId}
              onChange={(e) => setLegacyTeacherId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              {rows.map((row) => (
                <option key={row.teacherId} value={row.teacherId}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Student user ID
            <input
              value={legacyStudentId}
              onChange={(e) => setLegacyStudentId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted">
            Offering ID
            <input
              value={legacyOfferingId}
              onChange={(e) => setLegacyOfferingId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted">
            Rate yen
            <input
              inputMode="numeric"
              value={legacyRateYen}
              onChange={(e) => setLegacyRateYen(e.target.value.replace(/\D/g, ""))}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={
            busyId === "legacy-rate" ||
            !legacyTeacherId ||
            !legacyStudentId ||
            !legacyOfferingId ||
            !legacyRateYen
          }
          onClick={() => void saveLegacyRate()}
          className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
        >
          Save legacy rate
        </button>
      </section>
      {rows.map((row) => (
        <section key={row.teacherId} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{row.name}</h2>
              <p className="text-sm text-muted">{row.email ?? "No email"}</p>
              <p className="mt-2 text-sm text-muted">
                Calculated {tierLabel(row.calculatedTier)} / Effective {tierLabel(row.effectiveTier)}
              </p>
              {row.overrideTier ? (
                <p className="mt-1 text-xs text-muted">
                  Override: {tierLabel(row.overrideTier)} until{" "}
                  {row.overrideExpiresAt
                    ? new Date(row.overrideExpiresAt).toLocaleDateString()
                    : "admin changes it"}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted">
                Next review:{" "}
                {row.nextQuarterlyReviewAt
                  ? new Date(row.nextQuarterlyReviewAt).toLocaleDateString()
                  : "Not started"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === row.teacherId}
                onClick={() => void evaluate(row.teacherId)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
              >
                Evaluate now
              </button>
              {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={busyId === row.teacherId}
                  onClick={() => void setOverride(row.teacherId, tier)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
                >
                  Set {tierLabel(tier)}
                </button>
              ))}
              {row.overrideTier ? (
                <button
                  type="button"
                  disabled={busyId === row.teacherId}
                  onClick={() => void removeOverride(row.teacherId)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
                >
                  Remove override
                </button>
              ) : null}
            </div>
          </div>
          {row.pendingEvaluationId ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-medium">Annual demotion pending admin decision.</span>
              <button
                type="button"
                onClick={() => void decideEvaluation(row.pendingEvaluationId!, "approve-demotion")}
                className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
              >
                Approve demotion
              </button>
              <button
                type="button"
                onClick={() => void decideEvaluation(row.pendingEvaluationId!, "keep-tier")}
                className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
              >
                Keep tier
              </button>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
