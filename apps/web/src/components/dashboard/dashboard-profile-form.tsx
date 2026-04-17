"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { StudentBioMdxEditor } from "@/components/dashboard/student-bio-mdx-editor";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";

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
  const [name, setName] = useState(initialName ?? "");
  const [shortBio, setShortBio] = useState(
    () => (initialShortBio ?? "").slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const bioEditorRef = useRef<MDXEditorMethods>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        shortBio: shortBio.trim() === "" ? null : shortBio.trim().slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }

    const qsRedirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("onboardingNext")
        : null;
    const redirectTarget = postSaveRedirect ?? qsRedirect;
    if (typeof window !== "undefined") {
      console.info("[onboarding][student-profile-save]", {
        currentUrl: window.location.href,
        postSaveRedirect,
        qsRedirect,
        redirectTarget,
      });
    }
    if (redirectTarget) {
      try {
        router.push(decodeURIComponent(redirectTarget) as "/onboarding/next");
      } catch {
        router.push(redirectTarget as "/onboarding/next");
      }
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  const display = name.trim() || "—";
  const initial = display.slice(0, 2).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-foreground/5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {initial}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{t("avatarHelp")}</p>
      </div>

      <div>
        <label htmlFor="student-name" className="block text-sm font-medium text-foreground">
          {t("displayName")}
        </label>
        {showGooglePrefillHint ? (
          <p className="mt-0.5 text-xs text-muted">{t("prefillFromGoogle")}</p>
        ) : null}
        <input
          id="student-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </div>

      <div>
        <span id="student-short-bio-label" className="block text-sm font-medium text-foreground">
          {t("shortBio")}
        </span>
        <p id="student-short-bio-help" className="mt-0.5 text-xs text-muted">
          {t("shortBioHelp")}
        </p>
        <div
          role="group"
          aria-labelledby="student-short-bio-label"
          aria-describedby="student-short-bio-help student-short-bio-count"
          className="mdxeditor-rich-lists min-w-0 mt-2 overflow-visible rounded-xl border border-border bg-background text-sm text-foreground focus-within:ring-2 focus-within:ring-foreground/25 [&_.mdxeditor]:bg-background [&_.mdxeditor-root-contenteditable]:min-h-[200px]"
        >
          <StudentBioMdxEditor
            ref={bioEditorRef}
            markdown={shortBio}
            maxPlainTextLength={STUDENT_SHORT_BIO_MAX_CHARS}
            placeholder={t("shortBioPlaceholder")}
            onChange={(md) => {
              if (md.length <= STUDENT_SHORT_BIO_MAX_CHARS) {
                setShortBio(md);
                return;
              }
              const clipped = md.slice(0, STUDENT_SHORT_BIO_MAX_CHARS);
              setShortBio(clipped);
              queueMicrotask(() => bioEditorRef.current?.setMarkdown(clipped));
            }}
            contentEditableClassName="px-0 py-2 text-sm"
          />
        </div>
        <p
          id="student-short-bio-count"
          className={`mt-1 text-xs tabular-nums ${
            shortBio.length >= STUDENT_SHORT_BIO_MAX_CHARS
              ? "font-medium text-destructive"
              : shortBio.length > STUDENT_SHORT_BIO_MAX_CHARS * 0.85
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted"
          }`}
          aria-live="polite"
        >
          {t("shortBioCharCounter", { current: shortBio.length, max: STUDENT_SHORT_BIO_MAX_CHARS })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
        {status === "saved" ? <span className="text-sm text-green-600 dark:text-green-400">{t("saved")}</span> : null}
        {status === "error" ? <span className="text-sm text-destructive">{t("error")}</span> : null}
      </div>
    </form>
  );
}
