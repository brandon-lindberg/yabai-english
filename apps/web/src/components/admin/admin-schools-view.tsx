"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type OrgRole = "OWNER" | "ORG_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export type AdminSchool = {
  id: string;
  slug: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  applicationFlowEnabled: boolean;
  selfEnrollmentEnabled: boolean;
  memberCount: number;
};

export type AdminMembership = {
  id: string;
  orgRole: OrgRole;
  schoolId: string | null;
  user: { id: string; name: string | null; email: string | null };
};

export type AdminOrganization = {
  id: string;
  slug: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  timezone: string;
  billingTarget: "ORGANIZATION" | "STUDENT";
  allowTeacherMarketplace: boolean;
  createdAt: string;
  schools: AdminSchool[];
  memberships: AdminMembership[];
};

export function AdminSchoolsView({
  initialOrganizations,
}: {
  initialOrganizations: AdminOrganization[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.schoolsPage");

  return (
    <div className="mt-8 space-y-8">
      <CreateOrgForm onCreated={() => router.refresh()} />
      {initialOrganizations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
          {t("none")}
        </p>
      ) : (
        initialOrganizations.map((org) => (
          <OrgCard key={org.id} org={org} onChanged={() => router.refresh()} />
        ))
      )}
    </div>
  );
}

function CreateOrgForm({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("admin.schoolsPage");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        schoolName: schoolName.trim(),
        schoolSlug: schoolSlug.trim() || undefined,
        ownerEmail: ownerEmail.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? t("error"));
      return;
    }
    setName("");
    setSlug("");
    setSchoolName("");
    setSchoolSlug("");
    setOwnerEmail("");
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">{t("createTitle")}</h2>
      <p className="mt-1 text-xs text-muted">{t("createHelp")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t("orgName")} value={name} onChange={setName} required />
        <Field label={t("orgSlug")} value={slug} onChange={setSlug} required />
        <Field
          label={t("schoolName")}
          value={schoolName}
          onChange={setSchoolName}
          required
        />
        <Field
          label={t("schoolSlugOptional")}
          value={schoolSlug}
          onChange={setSchoolSlug}
        />
        <Field
          label={t("ownerEmail")}
          value={ownerEmail}
          onChange={setOwnerEmail}
          required
          type="email"
          fullWidth
        />
      </div>
      {error && <p className="mt-3 text-sm text-[var(--app-danger-text)]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-[var(--app-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-fg)] disabled:opacity-60"
      >
        {busy ? t("saving") : t("createCta")}
      </button>
    </form>
  );
}

function OrgCard({
  org,
  onChanged,
}: {
  org: AdminOrganization;
  onChanged: () => void;
}) {
  const t = useTranslations("admin.schoolsPage");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteOrg() {
    if (confirm !== org.slug) {
      setDeleteError(t("deleteConfirmMismatch"));
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch(`/api/org/${org.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data?.error ?? t("error"));
      return;
    }
    onChanged();
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{org.name}</h2>
          <p className="text-xs text-muted">
            {t("orgSlug")}: <code>{org.slug}</code> · TZ {org.timezone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("deleteConfirmPlaceholder", { slug: org.slug })}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={deleteOrg}
            disabled={deleting}
            className="rounded-md border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] px-3 py-1 text-xs font-semibold text-[var(--app-danger-text)] disabled:opacity-60"
          >
            {deleting ? t("deleting") : t("deleteOrg")}
          </button>
        </div>
      </header>
      {deleteError && (
        <p className="mt-2 text-sm text-[var(--app-danger-text)]">{deleteError}</p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("schoolsTitle")}</h3>
          <ul className="mt-2 space-y-2">
            {org.schools.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">
                  {s.name}{" "}
                  <span className="text-xs text-muted">
                    · <code>{s.slug}</code> · {s.memberCount} {t("members")}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <AddSchoolForm orgId={org.id} onAdded={onChanged} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("membersTitle")}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {org.memberships.map((m) => {
              const schoolName = m.schoolId
                ? (org.schools.find((s) => s.id === m.schoolId)?.name ?? m.schoolId)
                : t("orgWide");
              return (
                <li key={m.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    {m.user.name ?? m.user.email ?? m.user.id}
                  </span>
                  <span className="text-xs text-muted">
                    {m.orgRole} · {schoolName}
                  </span>
                </li>
              );
            })}
          </ul>
          <AssignRoleForm
            orgId={org.id}
            schools={org.schools}
            onAssigned={onChanged}
          />
        </div>
      </div>
    </section>
  );
}

function AddSchoolForm({
  orgId,
  onAdded,
}: {
  orgId: string;
  onAdded: () => void;
}) {
  const t = useTranslations("admin.schoolsPage");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/organizations/${orgId}/schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? t("error"));
      return;
    }
    setName("");
    setSlug("");
    onAdded();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-semibold text-muted">{t("addSchoolTitle")}</p>
      <Field label={t("schoolName")} value={name} onChange={setName} required compact />
      <Field label={t("schoolSlugOptional")} value={slug} onChange={setSlug} compact />
      {error && <p className="text-xs text-[var(--app-danger-text)]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[var(--app-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--app-primary-fg)] disabled:opacity-60"
      >
        {busy ? t("saving") : t("addSchoolCta")}
      </button>
    </form>
  );
}

function AssignRoleForm({
  orgId,
  schools,
  onAssigned,
}: {
  orgId: string;
  schools: AdminSchool[];
  onAssigned: () => void;
}) {
  const t = useTranslations("admin.schoolsPage");
  const [email, setEmail] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>("SCHOOL_ADMIN");
  const [schoolId, setSchoolId] = useState<string>(schools[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const orgWide = orgRole === "OWNER" || orgRole === "ORG_ADMIN";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/organizations/${orgId}/assign-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        orgRole,
        schoolId: orgWide ? null : schoolId,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? t("error"));
      return;
    }
    setEmail("");
    onAssigned();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-semibold text-muted">{t("assignRoleTitle")}</p>
      <Field
        label={t("userEmail")}
        value={email}
        onChange={setEmail}
        type="email"
        required
        compact
      />
      <div>
        <label className="block text-xs font-medium text-muted">{t("role")}</label>
        <select
          value={orgRole}
          onChange={(e) => setOrgRole(e.target.value as OrgRole)}
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          {(["OWNER", "ORG_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"] as const).map(
            (r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ),
          )}
        </select>
      </div>
      {!orgWide && (
        <div>
          <label className="block text-xs font-medium text-muted">{t("school")}</label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="text-xs text-[var(--app-danger-text)]">{error}</p>}
      <button
        type="submit"
        disabled={busy || (!orgWide && !schoolId)}
        className="rounded-md bg-[var(--app-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--app-primary-fg)] disabled:opacity-60"
      >
        {busy ? t("saving") : t("assignRoleCta")}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  fullWidth,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <label className="block text-xs font-medium text-muted">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-md border border-border bg-background px-2 ${
          compact ? "py-1 text-sm" : "py-2 text-sm"
        }`}
      />
    </div>
  );
}
