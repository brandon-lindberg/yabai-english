"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { Field } from "@/components/ui/field";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { clipMarkdown } from "@/lib/markdown/limits";

/**
 * A labelled markdown editor — the only way this app should collect prose.
 *
 * The two screens that had a markdown editor each hand-rolled the same three
 * things: the label/hint/aria wiring `Field` already owns, a wrapper whose long
 * classname had been copied and then drifted, and an identical clip-and-resync
 * `onChange`. All three live here now, once.
 *
 * On the cap: it counts markdown *source*, because that is what the column
 * stores. Bolding a word costs four characters, and a student at 300 will feel
 * that — which is why the counter is wired into the group's description rather
 * than left as decoration.
 */

type Props = {
  label: string;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  hideLabel?: boolean;
  value: string;
  onChange: (markdown: string) => void;
  /** Cap on stored markdown. Omit for uncapped fields; a counter appears when set. */
  maxChars?: number;
  placeholder?: string;
  /** `surface` sits on a card, `background` inside an inset panel. */
  tone?: "surface" | "background";
  /** Compact fields (inline notes) drop to `text-sm`. */
  size?: "md" | "sm";
  className?: string;
  minHeightClass?: string;
};

export function MarkdownField({
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  value,
  onChange,
  maxChars,
  placeholder,
  tone = "surface",
  size = "md",
  className = "",
  minHeightClass = "[&_.mdxeditor-root-contenteditable]:min-h-[160px]",
}: Props) {
  const t = useTranslations("common");
  const editorRef = useRef<MDXEditorMethods>(null);

  const counted = typeof maxChars === "number" && maxChars > 0;
  const overLimit = counted && value.length >= maxChars;
  const nearLimit = counted && value.length > maxChars * 0.85;

  /*
    Written out in full, never assembled from parts. Tailwind generates CSS by
    scanning source text for complete class literals, so building this variant
    through string interpolation yields a class name at runtime that no rule
    was ever emitted for, and the editor silently loses its background. The
    DOM still carries the class, so nothing but the eye catches it.
  */
  const toneClass =
    tone === "surface"
      ? "bg-surface [&_.mdxeditor]:bg-surface"
      : "bg-background [&_.mdxeditor]:bg-background";
  const shell = [
    "mdxeditor-rich-lists min-w-0 overflow-visible rounded-xl border border-border",
    "text-foreground focus-within:border-foreground",
    toneClass,
    minHeightClass,
    size === "sm" ? "text-sm" : "",
    error ? "border-[var(--app-danger)]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      as="group"
      className={className}
    >
      {(control, group) => {
        const counterId = `${control.id}-count`;
        const describedBy = [control["aria-describedby"], counted ? counterId : null]
          .filter(Boolean)
          .join(" ");

        return (
          <>
            <div
              role="group"
              aria-labelledby={group.labelId}
              aria-describedby={describedBy || undefined}
              className={shell}
            >
              <MarkdownEditor
                ref={editorRef}
                markdown={value}
                maxPlainTextLength={maxChars}
                placeholder={placeholder}
                contentEditableClassName={size === "sm" ? "px-0 py-2 text-sm" : "px-0 py-2"}
                onChange={(md) => {
                  const clipped = clipMarkdown(md, maxChars);
                  onChange(clipped);
                  // Only resync when we actually changed the document —
                  // setMarkdown moves the caret to the end, so doing it on
                  // every keystroke at the cap would make typing impossible.
                  if (clipped !== md) {
                    queueMicrotask(() => editorRef.current?.setMarkdown(clipped));
                  }
                }}
              />
            </div>
            {counted ? (
              <p
                id={counterId}
                className={`text-sm tabular-nums ${
                  overLimit
                    ? "font-medium text-[var(--app-danger)]"
                    : nearLimit
                      ? "text-[var(--app-warn-text)]"
                      : "text-muted"
                }`}
                aria-live="polite"
              >
                {t("markdownCharCounter", { current: value.length, max: maxChars })}
              </p>
            ) : null}
          </>
        );
      }}
    </Field>
  );
}
