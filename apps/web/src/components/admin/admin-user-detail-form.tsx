"use client";

import { AccountStatus, PlacedLevel, Role } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AdminTeacherProfileDto } from "@/lib/admin-user-dto";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { AdminTeacherRateGrants } from "@/components/admin/admin-teacher-rate-grants";

const LOCALES = ["ja", "en"] as const;
const ROLES = [Role.STUDENT, Role.TEACHER, Role.SUPER_ADMIN] as const;
const ACCOUNT_STATUSES = [AccountStatus.ACTIVE, AccountStatus.HIDDEN] as const;
const PLACED_LEVELS = [
  PlacedLevel.UNSET,
  PlacedLevel.BEGINNER,
  PlacedLevel.INTERMEDIATE,
  PlacedLevel.ADVANCED,
] as const;

type StudentProfileDto = {
  id: string;
  timezone: string;
  shortBio: string | null;
  placedLevel: PlacedLevel;
  placedSubLevel: number | null;
  placementNeedsReview: boolean;
  placementReviewReason: string | null;
};

type UserDetailJson = {
  id: string;
  name: string | null;
  email: string | null;
  locale: string;
  role: Role;
  accountStatus: AccountStatus;
  studentProfile: StudentProfileDto | null;
  teacherProfile: AdminTeacherProfileDto | null;
};

export function AdminUserDetailForm({ userId }: { userId: string }) {
  const t = useTranslations("admin.userDetail");
  const tg = useTranslations("admin.grid");
  const tGrants = useTranslations("admin.teacherRateGrants");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teacherProfileId, setTeacherProfileId] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [locale, setLocale] = useState("ja");
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(AccountStatus.ACTIVE);

  const [stuTz, setStuTz] = useState("");
  const [stuBio, setStuBio] = useState("");
  const [placedLevel, setPlacedLevel] = useState<PlacedLevel>(PlacedLevel.UNSET);
  const [placedSub, setPlacedSub] = useState<string>("");
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewReason, setReviewReason] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [credentials, setCredentials] = useState("");
  const [rateYen, setRateYen] = useState("");
  const [offersTrial, setOffersTrial] = useState(true);
  const [specialties, setSpecialties] = useState("");
  const [instrLangs, setInstrLangs] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = (await res.json()) as UserDetailJson & { error?: string };
      if (!res.ok) {
        setLoadError(true);
        setError(data.error ?? t("loadError"));
        return;
      }
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setLocale(data.locale);
      setRole(data.role);
      setAccountStatus(data.accountStatus);
      if (data.studentProfile) {
        setStuTz(data.studentProfile.timezone);
        setStuBio(data.studentProfile.shortBio ?? "");
        setPlacedLevel(data.studentProfile.placedLevel);
        setPlacedSub(
          data.studentProfile.placedSubLevel != null ? String(data.studentProfile.placedSubLevel) : "",
        );
        setNeedsReview(data.studentProfile.placementNeedsReview);
        setReviewReason(data.studentProfile.placementReviewReason ?? "");
      }
      if (data.teacherProfile) {
        setTeacherProfileId(data.teacherProfile.id);
        setCalendarConnected(data.teacherProfile.calendarConnected);
        setDisplayName(data.teacherProfile.displayName ?? "");
        setBio(data.teacherProfile.bio ?? "");
        setCountry(data.teacherProfile.countryOfOrigin ?? "");
        setCredentials(data.teacherProfile.credentials ?? "");
        setRateYen(
          data.teacherProfile.rateYen != null ? String(data.teacherProfile.rateYen) : "",
        );
        setOffersTrial(data.teacherProfile.offersFreeTrial);
        setSpecialties(data.teacherProfile.specialties.join(", "));
        setInstrLangs(data.teacherProfile.instructionLanguages.join(", "));
      } else {
        setCalendarConnected(false);
      }
    } finally {
      setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setStatusMsg(null);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim() || null,
        email: email.trim() || null,
        locale: locale.trim(),
        role,
        accountStatus,
      };
      if (role === Role.STUDENT) {
        body.studentProfile = {
          timezone: stuTz.trim() || undefined,
          shortBio: stuBio.trim() || null,
          placedLevel,
          placedSubLevel: placedSub.trim() ? Number(placedSub) : null,
          placementNeedsReview: needsReview,
          placementReviewReason: reviewReason.trim() || null,
        };
      }
      if (role === Role.TEACHER) {
        const langs = instrLangs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const rateNum = rateYen.trim() === "" ? null : Number(rateYen);
        body.teacherProfile = {
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || null,
          countryOfOrigin: country.trim() || null,
          credentials: credentials.trim() || null,
          rateYen: rateNum !== null && Number.isFinite(rateNum) ? rateNum : null,
          offersFreeTrial: offersTrial,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          instructionLanguages: langs.length > 0 ? langs : ["EN"],
        };
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error");
        return;
      }
      setStatusMsg(t("saved"));
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setHidden(next: AccountStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error");
        return;
      }
      setAccountStatus(next);
      await load();
    } finally {
      setSaving(false);
    }
  }

  /** `ConfirmDelete` owns the typed-confirmation guard; this only performs it. */
  async function remove() {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Error");
      return;
    }
    router.push("/admin/users");
  }

  if (loading) {
    return (
      <div
        className="space-y-10"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        data-testid="admin-user-detail-loading"
      >
        <section className="space-y-4 border-t border-border pt-6">
          <Skeleton height="6" width="1/3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-lg border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <Skeleton height="6" width="1/3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-lg border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
        </section>
        <div className="flex flex-wrap gap-2">
          <Skeleton height="10" width="1/4" rounded="full" className="!w-24" />
          <Skeleton height="10" width="1/4" rounded="full" className="!w-20" />
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <p role="alert">
        <Status tone="error">{error}</Status>
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      {statusMsg ? (
        <p role="status">
          <Status tone="settled">{statusMsg}</Status>
        </p>
      ) : null}

      <Section title={t("sectionUser")}>
        <div className="space-y-4">
          <Field label={t("name")}>
            {(field) => (
              <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
          <Field label={t("email")}>
            {(field) => (
              <Input
                {...field}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("locale")}>
            {(field) => (
              <Select
                {...field}
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("role")}>
            {(field) => (
              <Select
                {...field}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("accountStatus")}>
            {(field) => (
              <Select
                {...field}
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
              >
                {ACCOUNT_STATUSES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Section>

      {role === Role.STUDENT ? (
        <Section title={t("sectionStudent")}>
          <div className="space-y-4">
            <Field label={t("timezone")}>
              {(field) => (
                <Input {...field} value={stuTz} onChange={(e) => setStuTz(e.target.value)} />
              )}
            </Field>
            <Field label={t("shortBio")}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  value={stuBio}
                  onChange={(e) => setStuBio(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("placedLevel")}>
              {(field) => (
                <Select
                  {...field}
                  value={placedLevel}
                  onChange={(e) => setPlacedLevel(e.target.value as PlacedLevel)}
                >
                  {PLACED_LEVELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("placedSubLevel")}>
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={placedSub}
                  onChange={(e) => setPlacedSub(e.target.value)}
                />
              )}
            </Field>
            <CheckRow checked={needsReview} onChange={setNeedsReview}>
              {t("placementNeedsReview")}
            </CheckRow>
            <Field label={t("placementReviewReason")}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                />
              )}
            </Field>
          </div>
        </Section>
      ) : null}

      {role === Role.TEACHER ? (
        <Section title={t("sectionTeacher")}>
          <div className="space-y-4">
            <Field label={t("displayName")}>
              {(field) => (
                <Input
                  {...field}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("bio")}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("countryOfOrigin")}>
              {(field) => (
                <Input
                  {...field}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("credentials")}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("rateYen")}>
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={rateYen}
                  onChange={(e) => setRateYen(e.target.value)}
                />
              )}
            </Field>
            <CheckRow checked={offersTrial} onChange={setOffersTrial}>
              {t("offersFreeTrial")}
            </CheckRow>
            <Field label={t("specialties")}>
              {(field) => (
                <Input
                  {...field}
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("instructionLanguages")}>
              {(field) => (
                <Input
                  {...field}
                  value={instrLangs}
                  onChange={(e) => setInstrLangs(e.target.value)}
                />
              )}
            </Field>
            <p className="text-sm text-muted">
              {t("calendarConnected")}: {calendarConnected ? tg("yes") : tg("no")}
            </p>
          </div>
        </Section>
      ) : null}

      {/* Its own section, and its own endpoint: granting a below-minimum class
          is a concession recorded against an admin, not a profile field. */}
      {role === Role.TEACHER && teacherProfileId ? (
        <Section title={tGrants("title")}>
          <AdminTeacherRateGrants teacherProfileId={teacherProfileId} />
        </Section>
      ) : null}

      <div className="flex flex-wrap items-start gap-3 border-t border-border pt-6">
        <Button loading={saving} onClick={() => void save()}>
          {saving ? t("saving") : t("save")}
        </Button>
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() =>
            void setHidden(
              accountStatus === AccountStatus.ACTIVE
                ? AccountStatus.HIDDEN
                : AccountStatus.ACTIVE,
            )
          }
        >
          {accountStatus === AccountStatus.ACTIVE ? t("hide") : t("unhide")}
        </Button>
        {/*
          Deleting a user was styled amber, the colour this world reserves for
          attention — the same weight as "calendar not connected". It is the one
          irreversible control on the page.
        */}
        <ConfirmDelete
          triggerLabel={t("delete")}
          prompt={t("deleteConfirm")}
          expected={email}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          busy={saving}
          busyLabel={t("saving")}
          onConfirm={() => void remove()}
        />
      </div>
    </div>
  );
}
