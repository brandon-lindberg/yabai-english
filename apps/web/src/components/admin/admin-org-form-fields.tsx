"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui/field";

/**
 * The form pieces every organization form shares.
 *
 * `AdminField` and `UserEmailCombobox` are used by creating an organization,
 * adding a school, and assigning a role — which now live on two different
 * pages, so they can no longer sit inside either one.
 */

export function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

export function finalizeSlug(v: string): string {
  return v.replace(/^-+|-+$/g, "");
}

/**
 * A text field that also knows about slugs.
 *
 * This was called `Field` and shadowed `ui/field`'s `Field` inside this file —
 * two components, one name, different APIs. It now builds on the shared
 * primitives and keeps only what is genuinely its own: slug normalisation on
 * change, finalisation on blur, and the preview/error that go with them.
 */
export function AdminField({
  label,
  value,
  onChange,
  type = "text",
  required,
  fullWidth,
  slug,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  slug?: boolean;
  /** Shown unless a slug preview or an error takes the slot. */
  hint?: string | null;
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
      hint={showPreview ? `${t("slugPreview")}: ${finalized}` : (hint ?? null)}
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

export function UserEmailCombobox({
  label,
  value,
  onChange,
  required,
  fullWidth,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  fullWidth?: boolean;
  /** "Must already have an account" was a parenthetical inside the label. */
  hint?: string | null;
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
      <Field label={label} required={required} hint={hint}>
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
