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
 * An inset panel — content that sits *in* the page rather than on it.
 *
 * This used to be the default page wrapper — a bordered, shadowed surface —
 * which is how the app ended up as a tray of identical boxes with cards nested
 * three and four deep. Page structure now belongs to `Section`;
 * reach for this only when something genuinely needs to be set apart — a
 * preview, a callout, a self-contained widget.
 *
 * Recessed rather than elevated: the ground drops back instead of the panel
 * lifting, because this world has no elevation system. It never carries a
 * shadow, and it must never contain another card or a Section.
 */
export function AppCard({ children, className = "", padding = "md" }: Props) {
  return (
    <div className={`rounded-xl border border-border bg-background ${pad[padding]} ${className}`}>
      {children}
    </div>
  );
}
