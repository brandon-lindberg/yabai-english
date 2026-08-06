import type { ReactNode } from "react";

type Variant = "info" | "warning";

const variantClass: Record<Variant, string> = {
  info: "border-border bg-[var(--app-chip)] text-foreground",
  warning: "border-[var(--app-warn-border)] bg-[var(--app-warn-bg)] text-[var(--app-warn-text)]",
};

type Props = {
  variant?: Variant;
  /**
   * `note` is the default: standing context that was always on the page.
   * Use `status` or `alert` only when the message appears in response to
   * something the user did — otherwise a screen reader announces boilerplate.
   */
  role?: "note" | "status" | "alert";
  children: ReactNode;
  className?: string;
};

export function InlineAlert({ variant = "info", role = "note", children, className = "" }: Props) {
  return (
    <div
      role={role}
      className={`rounded-xl border px-3 py-2 text-sm leading-relaxed ${variantClass[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
