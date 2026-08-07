"use client";

import { useState } from "react";
import type { TeacherPlatformTier } from "@/generated/prisma/browser";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

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
      <section className="border-t border-border pt-6">
        <h2 className="font-semibold text-foreground">Legacy student rate override</h2>
        <p className="mt-1 text-sm text-muted">
          SUPER_ADMIN-only. Use this for student-specific rates below the public ¥3,000 minimum.
        </p>
        {/*
          NOTE: every string on this screen is hardcoded English — the component
          never calls `useTranslations`. Converting the controls does not change
          that; the screen still needs translating, tracked in AUDIT.md.
        */}
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="Teacher">
            {(field) => (
              <Select
                {...field}
                value={legacyTeacherId}
                onChange={(e) => setLegacyTeacherId(e.target.value)}
              >
                {rows.map((row) => (
                  <option key={row.teacherId} value={row.teacherId}>
                    {row.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Student user ID">
            {(field) => (
              <Input
                {...field}
                value={legacyStudentId}
                onChange={(e) => setLegacyStudentId(e.target.value)}
              />
            )}
          </Field>
          <Field label="Offering ID">
            {(field) => (
              <Input
                {...field}
                value={legacyOfferingId}
                onChange={(e) => setLegacyOfferingId(e.target.value)}
              />
            )}
          </Field>
          <Field label="Rate yen">
            {(field) => (
              <Input
                {...field}
                inputMode="numeric"
                value={legacyRateYen}
                onChange={(e) => setLegacyRateYen(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
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
          className={buttonClasses({ variant: "secondary", className: "mt-4" })}
        >
          Save legacy rate
        </button>
      </section>
      {rows.map((row) => (
        <section key={row.teacherId} className="border-t border-border pt-6">
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
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--app-warn-border)] bg-[var(--app-warn-bg)] p-3 text-sm text-[var(--app-warn-text)]">
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
