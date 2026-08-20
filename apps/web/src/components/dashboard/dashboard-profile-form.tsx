"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { StudentBioMdxEditor } from "@/components/dashboard/student-bio-mdx-editor";
import { DashboardProfileBioPreview } from "@/components/dashboard/dashboard-profile-bio-preview";
import { ProfileSurface } from "@/components/dashboard/profile-surface";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import type { SaveState } from "@/components/ui/form-status";
import { Field, Input } from "@/components/ui/field";

type Props = {
  /** When display name was suggested because profile name was empty */
  showGooglePrefillHint?: boolean;
  initialName: string | null;
  initialShortBio: string | null;
  avatarUrl: string | null;
  postSaveRedirect?: string | null;
};

export function DashboardProfileForm({
  showGooglePrefillHint = false,
  initialName,
  initialShortBio,
  avatarUrl,
  postSaveRedirect,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const router = useRouter();

  const [saved, setSaved] = useState({
    name: initialName ?? "",
    shortBio: (initialShortBio ?? "").slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
  });
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<SaveState>("idle");
  const bioEditorRef = useRef<MDXEditorMethods>(null);

  const isEmpty = !saved.name && !saved.shortBio;

  async function onSubmit(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim() || undefined,
        shortBio:
          draft.shortBio.trim() === ""
            ? null
            : draft.shortBio.trim().slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return false;
    }

    setSaved(draft);

    const qsRedirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("onboardingNext")
        : null;
    const redirectTarget = postSaveRedirect ?? qsRedirect;
    if (redirectTarget) {
      try {
        router.push(decodeURIComponent(redirectTarget) as "/onboarding/next");
      } catch {
        router.push(redirectTarget as "/onboarding/next");
      }
      return false;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    return true;
  }

  const overLimit = draft.shortBio.length >= STUDENT_SHORT_BIO_MAX_CHARS;
  const nearLimit = draft.shortBio.length > STUDENT_SHORT_BIO_MAX_CHARS * 0.85;

  return (
    <ProfileSurface
      avatarUrl={avatarUrl}
      name={saved.name}
      avatarHelp={t("avatarHelp")}
      emptyHint={t("emptyStudentProfileHint")}
      isEmpty={isEmpty}
      startInEdit={Boolean(postSaveRedirect)}
      saveState={status}
      copy={{
        edit: t("editProfile"),
        cancel: t("cancelEdit"),
        save: t("save"),
        saving: t("saving"),
        saved: t("saved"),
        error: t("error"),
        notSet: t("notSet"),
      }}
      entries={[
        {
          label: t("shortBio"),
          // Markdown, so it reads the way a teacher will see it rather than as
          // raw source.
          value: <DashboardProfileBioPreview markdown={saved.shortBio} emptyLabel="" />,
          empty: !saved.shortBio.trim(),
        },
      ]}
      onSave={onSubmit}
      onStartEdit={() => {
        setDraft(saved);
        setStatus("idle");
      }}
      onCancelEdit={() => {
        setDraft(saved);
        setStatus("idle");
        bioEditorRef.current?.setMarkdown(saved.shortBio);
      }}
    >
      <Field label={t("displayName")} hint={showGooglePrefillHint ? t("prefillFromGoogle") : null}>
        {(control) => (
          <Input
            {...control}
            name="name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={100}
          />
        )}
      </Field>

      <div>
        <span id="student-short-bio-label" className="block text-sm font-medium text-foreground">
          {t("shortBio")}
        </span>
        <p id="student-short-bio-help" className="mt-1 text-sm text-muted">
          {t("shortBioHelp")}
        </p>
        <div
          role="group"
          aria-labelledby="student-short-bio-label"
          aria-describedby="student-short-bio-help student-short-bio-count"
          className="mdxeditor-rich-lists mt-2 min-w-0 overflow-visible rounded-xl border border-border bg-surface text-foreground focus-within:border-foreground [&_.mdxeditor]:bg-surface [&_.mdxeditor-root-contenteditable]:min-h-[160px]"
        >
          <StudentBioMdxEditor
            ref={bioEditorRef}
            markdown={draft.shortBio}
            maxPlainTextLength={STUDENT_SHORT_BIO_MAX_CHARS}
            placeholder={t("shortBioPlaceholder")}
            onChange={(md) => {
              if (md.length <= STUDENT_SHORT_BIO_MAX_CHARS) {
                setDraft((d) => ({ ...d, shortBio: md }));
                return;
              }
              const clipped = md.slice(0, STUDENT_SHORT_BIO_MAX_CHARS);
              setDraft((d) => ({ ...d, shortBio: clipped }));
              queueMicrotask(() => bioEditorRef.current?.setMarkdown(clipped));
            }}
            contentEditableClassName="px-0 py-2"
          />
        </div>
        <p
          id="student-short-bio-count"
          className={`mt-1 text-sm tabular-nums ${
            overLimit
              ? "font-medium text-[var(--app-danger)]"
              : nearLimit
                ? "text-[var(--app-warn-text)]"
                : "text-muted"
          }`}
          aria-live="polite"
        >
          {t("shortBioCharCounter", {
            current: draft.shortBio.length,
            max: STUDENT_SHORT_BIO_MAX_CHARS,
          })}
        </p>
      </div>
    </ProfileSurface>
  );
}
