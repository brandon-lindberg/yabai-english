"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { TeachingLanguagesField } from "@/components/admin/teaching-languages-field";
import { LocalDateTime } from "@/components/local-datetime";
import { Button } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";
import { Section } from "@/components/ui/section";

type Invitation = { id: string; label: string | null; teachingLanguages: LearningLanguage[]; expiresAt: string };
type GeneratedInvitation = Invitation & { link: string };
const endpoint = "/api/admin/teacher-invitations";

export function AdminTeacherInvitations({ invitations }: { invitations: Invitation[] }) {
  const t = useTranslations("admin.teacherInvitations");
  const language = useTranslations("admin.teachingLanguages");
  const locale = useLocale();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const linkRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [subjects, setSubjects] = useState<LearningLanguage[]>([]);
  const [generated, setGenerated] = useState<GeneratedInvitation | null>(null);
  const [confirm, setConfirm] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "manualCopy" | null>(null);
  const [revoked, setRevoked] = useState<string[]>([]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`${endpoint}?locale=${locale}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, teachingLanguages: subjects }) });
      if (!response.ok) throw new Error("Invitation creation failed");
      setGenerated(await response.json() as GeneratedInvitation);
      setCopyState(null);
      setLabel("");
      startRefresh(() => router.refresh());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.link);
      setCopyState("copied");
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();
      setCopyState("manualCopy");
    }
  }

  async function revoke() {
    if (!confirm) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirm.id }) });
      if (!response.ok) throw new Error("Invitation revocation failed");
      setRevoked((ids) => [...ids, confirm.id]);
      if (generated?.id === confirm.id) setGenerated(null);
      setConfirm(null);
      startRefresh(() => router.refresh());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const active = invitations.filter((invite) => !revoked.includes(invite.id));
  return <div className="space-y-8">
    <form className="max-w-lg space-y-4" onSubmit={generate}>
      <Field label={t("label")} hint={t("labelHint")}>{(props) => <Input {...props} maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} />}</Field>
      <TeachingLanguagesField value={subjects} onChange={setSubjects} />
      <Button type="submit" disabled={!subjects.length} loading={busy && !confirm}>{t("generate")}</Button>
      {error && !confirm && <InlineAlert role="alert" variant="warning">{t("error")}</InlineAlert>}
    </form>

    {generated && <Section title={t("ready")} description={t("copyHelp")}>
      <div className="flex max-w-2xl flex-wrap items-end gap-2">
        <Field className="min-w-0 flex-1" label={t("link")}>{(props) => <Input {...props} ref={linkRef} value={generated.link} readOnly spellCheck={false} />}</Field>
        <Button variant="secondary" onClick={() => void copyLink()}>{t("copy")}</Button>
      </div>
      <p className="mt-2 text-sm text-muted">{t("expires")} <LocalDateTime iso={generated.expiresAt} locale={locale} /></p>
      {copyState && <p role="status" className="mt-2 text-sm text-muted">{t(copyState)}</p>}
    </Section>}

    <Section title={t("active")}>
      {active.length ? <DataList>{active.map((invite) => <DataRow key={invite.id} actions={
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setError(false); setConfirm(invite); }}>{t("revoke")}</Button>
      }>
        <p className="break-words font-semibold">{invite.label ?? t("unnamed")}</p>
        <p className="mt-1 text-sm text-muted">{invite.teachingLanguages.map((subject) => language(subject)).join(" · ")}</p>
        <p className="mt-1 text-sm text-muted">{t("expires")} <LocalDateTime iso={invite.expiresAt} locale={locale} /></p>
      </DataRow>)}</DataList> : <p className="border-y border-border py-4 text-sm text-muted" role={refreshing ? "status" : undefined}>{t(refreshing ? "refreshing" : "empty")}</p>}
    </Section>

    {confirm && <Modal open title={t("revokeTitle")} onClose={() => { if (!busy) setConfirm(null); }} dismissOnBackdrop={!busy}
      actions={<><Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>{t("cancel")}</Button>
        <Button variant="destructive" loading={busy} onClick={() => void revoke()}>{t("revoke")}</Button></>}>
      <p className="text-sm text-muted">{t("revokeHelp")}</p>
      {error && <InlineAlert role="alert" variant="warning">{t("error")}</InlineAlert>}
    </Modal>}
  </div>;
}
