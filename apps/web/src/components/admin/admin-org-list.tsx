"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AdminOrganizationSummary } from "@/components/admin/admin-org-types";
import {
  AdminField,
  UserEmailCombobox,
  finalizeSlug,
  normalizeSlugInput,
} from "@/components/admin/admin-org-form-fields";
import { Button } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Status } from "@/components/ui/status";

/**
 * Every organization, as a list you click into.
 *
 * This page used to manage all of them at once: each organization rendered its
 * schools, its members, an add-school form and an assign-role form inline, so
 * one organization filled two viewports and the page had no single job. Adding
 * a second organization doubled it again.
 *
 * A list is a list. Managing one organization is its own page.
 */
export function AdminOrgList({
  organizations,
}: {
  organizations: AdminOrganizationSummary[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.schoolsPage");
  const hasOrgs = organizations.length > 0;

  return (
    <div className="mt-8 space-y-8">
      {hasOrgs ? (
        <DataList>
          {organizations.map((org) => (
            /*
              The whole row is the link, the same way an onboarding step with no
              controls of its own is. A separate "Manage" word beside a row-wide
              hover promised more than it delivered; linking only the name left
              nothing marking the row as navigable at all, because `--app-link`
              is the same ink as the foreground.
            */
            <DataRow key={org.id} interactive>
              <Link
                href={`/admin/schools/${org.id}`}
                className="block text-foreground"
                aria-label={org.name}
              >
                <p className="text-base font-semibold">{org.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  <code>{org.slug}</code> · {org.timezone} ·{" "}
                  {t("schoolCount", { count: org.schoolCount })} ·{" "}
                  {t("memberCount", { count: org.memberCount })}
                </p>
              </Link>
            </DataRow>
          ))}
        </DataList>
      ) : (
        <EmptyState title={t("none")} />
      )}

      <details open={!hasOrgs} className="border-t border-border pt-6">
        <summary className="cursor-pointer text-lg font-semibold text-foreground underline-offset-4 hover:underline">
          {t("createTitle")}
        </summary>
        <CreateOrgForm onCreated={() => router.refresh()} />
      </details>
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
  /*
    Both slugs follow their name until an admin edits one. They were two of the
    five fields on the critical path, typed by hand, from the name sitting
    beside them — and the organization's was required while the school's was
    not, for no reason a person could see.
  */
  const [slugTouched, setSlugTouched] = useState(false);
  const [schoolSlugTouched, setSchoolSlugTouched] = useState(false);

  function changeName(next: string) {
    setName(next);
    if (!slugTouched) setSlug(normalizeSlugInput(next));
  }
  function changeSchoolName(next: string) {
    setSchoolName(next);
    if (!schoolSlugTouched) setSchoolSlug(normalizeSlugInput(next));
  }

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
    setSlugTouched(false);
    setSchoolSlugTouched(false);
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-6">
      <p className="max-w-[62ch] text-sm text-muted">{t("createHelp")}</p>

      {/* Five flat fields belonging to three different things: the
          organization, the school it opens with, and the person who runs it. */}
      <fieldset>
        <legend className="text-sm font-semibold text-foreground">{t("orgLegend")}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <AdminField label={t("orgName")} value={name} onChange={changeName} required />
          <AdminField
            label={t("orgSlug")}
            hint={t("slugHint")}
            value={slug}
            onChange={(v) => {
              setSlugTouched(true);
              setSlug(v);
            }}
            required
            slug
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-foreground">{t("firstSchoolLegend")}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <AdminField
            label={t("schoolName")}
            value={schoolName}
            onChange={changeSchoolName}
            required
          />
          <AdminField
            label={t("schoolSlug")}
            hint={t("slugHint")}
            value={schoolSlug}
            onChange={(v) => {
              setSchoolSlugTouched(true);
              setSchoolSlug(v);
            }}
            slug
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-foreground">{t("ownerLegend")}</legend>
        <div className="mt-3">
          <UserEmailCombobox
            label={t("ownerEmail")}
            hint={t("ownerEmailHint")}
            value={ownerEmail}
            onChange={setOwnerEmail}
            required
          />
        </div>
      </fieldset>

      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}

      <Button type="submit" loading={busy}>
        {busy ? t("saving") : t("createCta")}
      </Button>
    </form>
  );
}
