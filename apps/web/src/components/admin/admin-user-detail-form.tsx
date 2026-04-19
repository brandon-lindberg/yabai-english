"use client";

import { AccountStatus, PlacedLevel, Role } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AdminTeacherProfileDto } from "@/lib/admin-user-dto";
import { Skeleton } from "@/components/ui/skeleton";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  async function remove() {
    const typed = window.prompt(t("deleteConfirm"));
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== (email.trim().toLowerCase() || "")) {
      setError("Email did not match.");
      return;
    }
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
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
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
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
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
    return <p className="text-sm text-[var(--app-warning-text)]">{error}</p>;
  }

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-[var(--app-warning-text)]">{error}</p> : null}
      {statusMsg ? <p className="text-sm text-muted">{statusMsg}</p> : null}

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">{t("sectionUser")}</h2>
        <label className="block text-sm">
          <span className="text-muted">{t("name")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("email")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("locale")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("role")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {[Role.STUDENT, Role.TEACHER, Role.ADMIN].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("accountStatus")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
          >
            {[AccountStatus.ACTIVE, AccountStatus.HIDDEN].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </section>

      {role === Role.STUDENT ? (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-foreground">{t("sectionStudent")}</h2>
          <label className="block text-sm">
            <span className="text-muted">{t("timezone")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={stuTz}
              onChange={(e) => setStuTz(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("shortBio")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              rows={3}
              value={stuBio}
              onChange={(e) => setStuBio(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("placedLevel")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={placedLevel}
              onChange={(e) => setPlacedLevel(e.target.value as PlacedLevel)}
            >
              {(
                [
                  PlacedLevel.UNSET,
                  PlacedLevel.BEGINNER,
                  PlacedLevel.INTERMEDIATE,
                  PlacedLevel.ADVANCED,
                ] as const
              ).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("placedSubLevel")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={placedSub}
              onChange={(e) => setPlacedSub(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            <span>{t("placementNeedsReview")}</span>
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("placementReviewReason")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              rows={2}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </label>
        </section>
      ) : null}

      {role === Role.TEACHER ? (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-foreground">{t("sectionTeacher")}</h2>
          <label className="block text-sm">
            <span className="text-muted">{t("displayName")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("bio")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("countryOfOrigin")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("credentials")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              rows={3}
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("rateYen")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={rateYen}
              onChange={(e) => setRateYen(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={offersTrial}
              onChange={(e) => setOffersTrial(e.target.checked)}
            />
            <span>{t("offersFreeTrial")}</span>
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("specialties")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("instructionLanguages")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={instrLangs}
              onChange={(e) => setInstrLangs(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted">
            {t("calendarConnected")}: {calendarConnected ? tg("yes") : tg("no")}
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-[var(--app-on-accent)] disabled:opacity-50"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("saving") : t("save")}
        </button>
        {accountStatus === AccountStatus.ACTIVE ? (
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm"
            disabled={saving}
            onClick={() => void setHidden(AccountStatus.HIDDEN)}
          >
            {t("hide")}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm"
            disabled={saving}
            onClick={() => void setHidden(AccountStatus.ACTIVE)}
          >
            {t("unhide")}
          </button>
        )}
        <button
          type="button"
          className="rounded-full border border-[var(--app-warning-border)] px-4 py-2 text-sm text-[var(--app-warning-text)]"
          disabled={saving}
          onClick={() => void remove()}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
