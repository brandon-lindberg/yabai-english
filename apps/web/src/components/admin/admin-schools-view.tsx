"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Button } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Field, Input, Select } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

function finalizeSlug(v: string): string {
  return v.replace(/^-+|-+$/g, "");
}

type OrgRole = "OWNER" | "ORG_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export type AdminSchool = {
  id: string;
  slug: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  memberCount: number;
};

export type AdminMembership = {
  id: string;
  orgRole: OrgRole;
  schoolId: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
};

export type AdminOrganization = {
  id: string;
  slug: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  timezone: string;
  billingTarget: "ORGANIZATION" | "STUDENT";
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
    const finalSlug = finalizeSlug(slug);
    const finalSchoolSlug = finalizeSlug(schoolSlug);
    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: finalSlug,
        schoolName: schoolName.trim(),
        schoolSlug: finalSchoolSlug || undefined,
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
      className="border-t border-border pt-6"
    >
      <h2 className="text-lg font-semibold text-foreground">{t("createTitle")}</h2>
      <p className="mt-1 text-xs text-muted">{t("createHelp")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AdminField label={t("orgName")} value={name} onChange={setName} required />
        <AdminField label={t("orgSlug")} value={slug} onChange={setSlug} required slug />
        <AdminField
          label={t("schoolName")}
          value={schoolName}
          onChange={setSchoolName}
          required
        />
        <AdminField
          label={t("schoolSlugOptional")}
          value={schoolSlug}
          onChange={setSchoolSlug}
          slug
        />
        <UserEmailCombobox
          label={t("ownerEmail")}
          value={ownerEmail}
          onChange={setOwnerEmail}
          required
          fullWidth
        />
      </div>
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      {/* Three different hand-rolled submit buttons lived in this file —
          `rounded-lg … py-2 text-sm` here and `rounded-md … py-1 text-xs`
          twice below, the latter about 26px tall. */}
      <Button type="submit" loading={busy} className="mt-4">
        {busy ? t("saving") : t("createCta")}
      </Button>
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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteOrg() {
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
    <section className="border-t border-border pt-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{org.name}</h2>
          <p className="text-xs text-muted">
            {t("orgSlug")}: <code>{org.slug}</code> · TZ {org.timezone}
          </p>
        </div>
        <ConfirmDelete
          triggerLabel={t("deleteOrg")}
          prompt={t.rich("deleteConfirmPrompt", {
          slug: org.slug,
          code: (chunks) => <code className="font-semibold">{chunks}</code>,
          })}
          expected={org.slug}
          confirmLabel={t("confirmDeleteCta")}
          cancelLabel={t("cancel")}
          busy={deleting}
          busyLabel={t("deleting")}
          error={deleteError}
          onConfirm={() => void deleteOrg()}
        />
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("schoolsTitle")}</h3>
          {/* Was one bordered card per school — a stack of trays where a
              ruled list reads as one list. */}
          <DataList className="mt-2">
            {org.schools.map((s) => (
              <DataRow key={s.id}>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  <code>{s.slug}</code> · {s.memberCount} {t("members")}
                </p>
              </DataRow>
            ))}
          </DataList>
          <AddSchoolForm orgId={org.id} onAdded={onChanged} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("membersTitle")}</h3>
          {/* Was an unruled list sitting beside a ruled one, in the same row of
              the same grid — two treatments for two lists of equal weight. */}
          <DataList className="mt-2">
            {org.memberships.map((m) => {
              const schoolName = m.schoolId
                ? (org.schools.find((s) => s.id === m.schoolId)?.name ?? m.schoolId)
                : t("orgWide");
              return (
                <DataRow
                  key={m.id}
                  actions={
                    <span className="text-sm text-muted">
                      {m.orgRole} · {schoolName}
                    </span>
                  }
                >
                  <p className="font-medium text-foreground">
                    {m.user?.name ?? m.user?.email ?? m.user?.id ?? ""}
                  </p>
                </DataRow>
              );
            })}
          </DataList>
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
    const finalSlug = finalizeSlug(slug);
    const res = await fetch(`/api/admin/organizations/${orgId}/schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: finalSlug || undefined,
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

  /*
    Was a dashed box inside a column inside a section — a container three deep.
    Structure here comes from a rule and space.
  */
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-foreground">{t("addSchoolTitle")}</p>
      <AdminField label={t("schoolName")} value={name} onChange={setName} required />
      <AdminField label={t("schoolSlugOptional")} value={slug} onChange={setSlug} slug />
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <Button type="submit" size="sm" loading={busy}>
        {busy ? t("saving") : t("addSchoolCta")}
      </Button>
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
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-foreground">{t("assignRoleTitle")}</p>
      <UserEmailCombobox
        label={t("userEmail")}
        value={email}
        onChange={setEmail}
        required
      />
      {/* Both labels were detached — no `htmlFor`, not wrapping — so neither
          select had an accessible name. */}
      <Field label={t("role")}>
        {(field) => (
          <Select
            {...field}
            value={orgRole}
            onChange={(e) => setOrgRole(e.target.value as OrgRole)}
          >
            {(["OWNER", "ORG_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"] as const).map(
              (r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ),
            )}
          </Select>
        )}
      </Field>
      {!orgWide && (
        <Field label={t("school")}>
          {(field) => (
            <Select
              {...field}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <Button type="submit" size="sm" loading={busy} disabled={!orgWide && !schoolId}>
        {busy ? t("saving") : t("assignRoleCta")}
      </Button>
    </form>
  );
}

/**
 * A text field that also knows about slugs.
 *
 * This was called `Field` and shadowed `ui/field`'s `Field` inside this file —
 * two components, one name, different APIs. It now builds on the shared
 * primitives and keeps only what is genuinely its own: slug normalisation on
 * change, finalisation on blur, and the preview/error that go with them.
 */
function AdminField({
  label,
  value,
  onChange,
  type = "text",
  required,
  fullWidth,
  slug,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  slug?: boolean;
}) {
  const t = useTranslations("admin.schoolsPage");
  const finalized = slug ? finalizeSlug(value) : value;
  const showPreview = slug && value.length > 0 && finalized !== value;
  const showEmptyError = slug && required && value.length > 0 && finalized.length === 0;

  return (
    <Field
      label={label}
      required={required}
      className={fullWidth ? "sm:col-span-2" : undefined}
      error={showEmptyError ? t("slugInvalidEmpty") : null}
      hint={showPreview ? `${t("slugPreview")}: ${finalized}` : null}
    >
      {(control) => (
        <Input
          {...control}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(slug ? normalizeSlugInput(e.target.value) : e.target.value)}
          onBlur={() => {
            if (slug) onChange(finalizeSlug(value));
          }}
        />
      )}
    </Field>
  );
}

type UserSuggestion = {
  id: string;
  name: string | null;
  email: string | null;
};

function UserEmailCombobox({
  label,
  value,
  onChange,
  required,
  fullWidth,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  fullWidth?: boolean;
}) {
  const t = useTranslations("admin.schoolsPage");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/users?q=${encodeURIComponent(q)}&pageSize=8`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { items: UserSuggestion[] };
        setResults(data.items ?? []);
        setHighlight(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(u: UserSuggestion) {
    if (!u.email) return;
    justSelectedRef.current = true;
    onChange(u.email);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      const pick_ = results[highlight];
      if (pick_) {
        e.preventDefault();
        pick(pick_);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown =
    open && value.trim().length >= 2 && (loading || results.length > 0);

  return (
    <div
      ref={wrapperRef}
      className={`relative ${fullWidth ? "sm:col-span-2" : ""}`}
    >
      <Field label={label} required={required}>
        {(field) => (
          <Input
            {...field}
            type="email"
            required={required}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
        )}
      </Field>
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-background py-1"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted">{t("searching")}</li>
          )}
          {results.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlight ? "bg-[var(--app-hover)]" : ""
              }`}
            >
              <p className="text-foreground">{u.name ?? u.email ?? u.id}</p>
              {u.email && u.name && (
                <p className="text-xs text-muted">{u.email}</p>
              )}
            </li>
          ))}
          {!loading && results.length === 0 && value.trim().length >= 2 && (
            <li className="px-3 py-2 text-xs text-muted">{t("noResults")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
