"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AdminOrganization, AdminSchool, OrgRole } from "@/components/admin/admin-org-types";
import {
  AdminField,
  UserEmailCombobox,
  finalizeSlug,
  normalizeSlugInput,
} from "@/components/admin/admin-org-form-fields";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Field, Select } from "@/components/ui/field";
import { Status } from "@/components/ui/status";
import { groupMembershipsByPerson } from "@/lib/org/member-identity";

/**
 * One organization: its schools, its members, and the two things you do to it.
 *
 * Split out of the list page, which had been managing every organization at
 * once. Here the org is the whole page, so its schools and members are the
 * content rather than a column inside a card, and the forms that add to them
 * sit under the list each one adds to.
 */
export function AdminOrgDetail({ org }: { org: AdminOrganization }) {
  const router = useRouter();
  const t = useTranslations("admin.schoolsPage");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteOrg() {
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch(`/api/org/${org.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const data = await res.json().catch(() => ({}));
      setDeleteError(data?.error ?? t("error"));
      return;
    }
    // The organization this page is about no longer exists.
    router.push("/admin/schools");
  }

  const schoolCount = org.schools.length;
  const memberCount = org.memberships.length;

  return (
    <div className="space-y-10">
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t("schoolsTitle")}</h2>
          <DataList className="mt-2">
            {org.schools.map((school) => (
              <DataRow key={school.id}>
                <p className="font-medium text-foreground">{school.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  <code>{school.slug}</code> ·{" "}
                  {t("memberCount", { count: school.memberCount })}
                </p>
              </DataRow>
            ))}
          </DataList>
          <details open={schoolCount === 0} className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground underline-offset-4 hover:underline">
              {t("addSchoolTitle")}
            </summary>
            <AddSchoolForm orgId={org.id} onAdded={() => router.refresh()} />
          </details>
        </section>

        <section className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t("membersTitle")}</h2>
          {/*
            One row per person, not per grant. The same member appeared twice —
            once as OWNER · Org-wide and once as SCHOOL_ADMIN · their school —
            which reads as a duplicate rather than as one person with two roles.
          */}
          <DataList className="mt-2">
            {groupMembershipsByPerson(org.memberships).map(({ key, memberships }) => {
              const first = memberships[0]!;
              const name =
                first.user?.name ?? first.user?.email ?? first.inviteEmail ?? "";
              return (
                <DataRow
                  key={key}
                  actions={
                    <span className="flex flex-col items-start gap-0.5 text-sm text-muted sm:items-end">
                      {memberships.map((m) => (
                        <span key={m.id}>
                          {m.orgRole} ·{" "}
                          {m.schoolId
                            ? (org.schools.find((school) => school.id === m.schoolId)?.name ??
                              m.schoolId)
                            : t("orgWide")}
                        </span>
                      ))}
                    </span>
                  }
                >
                  <p className="font-medium text-foreground">{name}</p>
                  {first.user ? null : (
                    <p className="mt-0.5 text-sm text-muted">{t("invitePending")}</p>
                  )}
                </DataRow>
              );
            })}
          </DataList>
          <details open={memberCount === 0} className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground underline-offset-4 hover:underline">
              {t("assignRoleTitle")}
            </summary>
            <AssignRoleForm
              orgId={org.id}
              schools={org.schools}
              onAssigned={() => router.refresh()}
            />
          </details>
        </section>
      </div>

      {/* Deleting the organization ends the page you are on, so it belongs at
          the end of it rather than beside the title. */}
      <section className="border-t border-border pt-6">
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
      </section>
    </div>
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
  const [slugTouched, setSlugTouched] = useState(false);
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
    setSlugTouched(false);
    onAdded();
  }

  /*
    Was a dashed box inside a column inside a section — a container three deep.
    Structure here comes from a rule and space.
  */
  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      {/* Same auto-derived slug as creating an organization. */}
      <AdminField
        label={t("schoolName")}
        value={name}
        onChange={(next) => {
          setName(next);
          if (!slugTouched) setSlug(normalizeSlugInput(next));
        }}
        required
      />
      <AdminField
        label={t("schoolSlug")}
        value={slug}
        hint={t("slugHint")}
        onChange={(next) => {
          setSlugTouched(true);
          setSlug(next);
        }}
        slug
      />
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
    <form onSubmit={submit} className="mt-3 space-y-3">
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
