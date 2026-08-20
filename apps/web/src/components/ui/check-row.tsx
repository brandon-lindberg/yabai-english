"use client";

import type { ReactNode } from "react";

/**
 * A checkbox and its label, at a size you can actually hit.
 *
 * Twenty checkboxes across the app were hand-assembled as
 * `<label className="flex items-start gap-2"><input type="checkbox" className="mt-1">`,
 * every one left at the browser's default ~13px box — under the 24px floor WCAG
 * 2.5.8 sets for a pointer target, with a hit area that stopped at the box.
 * Here the row is the target and the box is 20px inside a 44px row.
 *
 * Labels may contain links; the consent rows do. That is safe without any
 * guard — a label's activation behaviour explicitly does nothing for events
 * targeted at interactive-content descendants, so opening the Terms does not
 * also agree to them.
 */
export function CheckRow({
  checked,
  onChange,
  disabled = false,
  description,
  className = "",
  children,
  ...rest
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Secondary line beneath the label. */
  description?: ReactNode;
  className?: string;
  children: ReactNode;
} & { "data-testid"?: string }) {
  return (
    <label
      className={[
        "flex min-h-11 items-start gap-3 py-1.5 text-sm text-foreground",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        {...rest}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 flex-none accent-[var(--app-primary)]"
      />
      <span className="min-w-0 flex-1 leading-relaxed">
        {children}
        {description ? (
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
