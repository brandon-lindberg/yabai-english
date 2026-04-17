import type { ReactNode } from "react";

type Variant = "info" | "warning";

const variantClass: Record<Variant, string> = {
  info: "border-border bg-[var(--app-chip)] text-foreground",
  warning: "border-[var(--app-warn-border)] bg-[var(--app-warn-bg)] text-[var(--app-warn-text)]",
};

type Props = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

export function InlineAlert({ variant = "info", children, className = "" }: Props) {
  return (
    <div
      role="note"
      className={`rounded-xl border px-3 py-2 text-sm leading-relaxed ${variantClass[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
