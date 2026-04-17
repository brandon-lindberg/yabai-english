import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

const pad = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

/**
 * Default elevated surface for pages (cards, panels).
 */
export function AppCard({ children, className = "", padding = "md" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-sm ${pad[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
