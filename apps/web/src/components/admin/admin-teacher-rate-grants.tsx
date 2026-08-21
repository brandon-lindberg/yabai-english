"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { MIN_PUBLIC_LESSON_RATE_YEN } from "@/lib/lesson-rate-policy";

type TaxonomyOption = { id: string; labelEn: string; labelJa: string | null };

type Grant = {
  id: string;
  durationMin: number;
  rateYen: number;
  adminRateOverrideNote: string | null;
  classLevel: { labelEn: string; labelJa: string | null } | null;
  classType: { labelEn: string; labelJa: string | null } | null;
};

type Loaded = {
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
  grants: Grant[];
};

const DURATIONS = [20, 30, 40, 60, 90] as const;

function pickLabel(
  option: { labelEn: string; labelJa: string | null } | null,
  locale: string,
): string {
  if (!option) return "—";
  return locale.startsWith("ja") ? (option.labelJa ?? option.labelEn) : option.labelEn;
}

/**
 * Granting a teacher a class priced under the public minimum.
 *
 * Kept out of the profile form because it is a different kind of act: it writes
 * through its own endpoint, and it is a concession recorded against an admin
 * rather than a field of the teacher's profile.
 */
export function AdminTeacherRateGrants({ teacherProfileId }: { teacherProfileId: string }) {
  const t = useTranslations("admin.teacherRateGrants");
  const locale = useLocale();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [durationMin, setDurationMin] = useState<number>(30);
  const [rateInput, setRateInput] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [classTypeId, setClassTypeId] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teacher-offerings?teacherId=${teacherProfileId}`);
      const body = (await res.json()) as Loaded & { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("error"));
        return;
      }
      setData(body);
      setClassLevelId((current) => current || (body.classLevels[0]?.id ?? ""));
      setClassTypeId((current) => current || (body.classTypes[0]?.id ?? ""));
    } catch {
      setError(t("error"));
    }
  }, [teacherProfileId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const amount = MIN_PUBLIC_LESSON_RATE_YEN.toLocaleString();
  const entered = Number.parseInt(rateInput.trim(), 10);
  // The same rule the API enforces, said before the round trip rather than after.
  const needsNoGrant = !Number.isNaN(entered) && entered >= MIN_PUBLIC_LESSON_RATE_YEN;
  const canGrant =
    !Number.isNaN(entered) && entered > 0 && !needsNoGrant && Boolean(classLevelId && classTypeId);

  async function grant() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teacher-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacherProfileId,
          durationMin,
          rateYen: entered,
          classLevelId,
          classTypeId,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? t("error"));
        return;
      }
      setRateInput("");
      setNote("");
      await load();
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function revoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teacher-offerings?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      await load();
    } catch {
      setError(t("error"));
    } finally {
      setRevokingId(null);
    }
  }

  if (!data) {
    return (
      <div role="status" aria-busy="true" aria-label={t("loading")} className="space-y-2">
        <Skeleton height="3" width="3/4" />
        <Skeleton height="3" width="1/2" />
      </div>
    );
  }

  const hasTaxonomy = data.classLevels.length > 0 && data.classTypes.length > 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t("intro", { amount })}</p>

      {data.grants.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-2">
          {data.grants.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground tabular-nums">
                  ¥{grant.rateYen.toLocaleString()} · {grant.durationMin} min
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {pickLabel(grant.classLevel, locale)} · {pickLabel(grant.classType, locale)}
                </p>
                {grant.adminRateOverrideNote ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted">
                    {grant.adminRateOverrideNote}
                  </p>
                ) : null}
              </div>
              <Button
                variant="secondary"
                loading={revokingId === grant.id}
                disabled={revokingId !== null}
                onClick={() => void revoke(grant.id)}
              >
                {revokingId === grant.id ? t("revoking") : t("revoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {data.grants.length > 0 ? (
        <p className="text-xs text-muted">{t("revokeHelp")}</p>
      ) : null}

      {!hasTaxonomy ? (
        <p className="text-sm text-muted">{t("noTaxonomy")}</p>
      ) : (
        <div className="space-y-4 border-t border-border pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("duration")}>
              {(field) => (
                <Select
                  {...field}
                  value={String(durationMin)}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label={t("rate")}
              error={needsNoGrant ? t("aboveMinimum", { amount }) : null}
            >
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
            <Field label={t("level")}>
              {(field) => (
                <Select
                  {...field}
                  value={classLevelId}
                  onChange={(e) => setClassLevelId(e.target.value)}
                >
                  {data.classLevels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {pickLabel(option, locale)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("type")}>
              {(field) => (
                <Select
                  {...field}
                  value={classTypeId}
                  onChange={(e) => setClassTypeId(e.target.value)}
                >
                  {data.classTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {pickLabel(option, locale)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label={t("note")}>
            {(field) => (
              <Input {...field} value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </Field>

          <Button loading={saving} disabled={!canGrant || saving} onClick={() => void grant()}>
            {saving ? t("granting") : t("grant")}
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
    </div>
  );
}
