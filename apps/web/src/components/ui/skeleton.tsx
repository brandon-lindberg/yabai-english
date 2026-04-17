import type { ReactNode } from "react";

/**
 * Shared skeleton primitives driven by the `animate-shimmer` utility defined in
 * `globals.css`. All primitives render with `aria-hidden` so they never leak
 * into the accessibility tree; surround them with a parent element that carries
 * the meaningful `role="status"` + aria-live hint when needed.
 */

type SkeletonProps = {
  className?: string;
  /** Shortcut for common widths, e.g. "1/2" → "w-1/2". */
  width?: "full" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4";
  /** Shortcut for common heights. */
  height?: "3" | "4" | "5" | "6" | "8" | "10" | "12" | "16" | "24";
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
};

const widthClass: Record<NonNullable<SkeletonProps["width"]>, string> = {
  full: "w-full",
  "3/4": "w-3/4",
  "2/3": "w-2/3",
  "1/2": "w-1/2",
  "1/3": "w-1/3",
  "1/4": "w-1/4",
};

const heightClass: Record<NonNullable<SkeletonProps["height"]>, string> = {
  "3": "h-3",
  "4": "h-4",
  "5": "h-5",
  "6": "h-6",
  "8": "h-8",
  "10": "h-10",
  "12": "h-12",
  "16": "h-16",
  "24": "h-24",
};

const roundedClass: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const classes = [
    "app-skeleton",
    width ? widthClass[width] : "w-full",
    height ? heightClass[height] : "h-4",
    roundedClass[rounded],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span data-testid="skeleton" aria-hidden="true" className={classes} />;
}

type SkeletonTextProps = {
  lines?: number;
  /** Width of the final line so it looks like flowing prose. */
  lastLineWidth?: NonNullable<SkeletonProps["width"]>;
  className?: string;
};

export function SkeletonText({
  lines = 3,
  lastLineWidth = "3/4",
  className,
}: SkeletonTextProps) {
  const rowCount = Math.max(1, lines);
  return (
    <div
      className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}
      data-testid="skeleton-text"
    >
      {Array.from({ length: rowCount }).map((_, i) => {
        const isLast = i === rowCount - 1 && rowCount > 1;
        return (
          <Skeleton
            key={i}
            height="3"
            width={isLast ? lastLineWidth : "full"}
          />
        );
      })}
    </div>
  );
}

const AVATAR_SIZE = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
} as const;

export function SkeletonAvatar({
  size = "md",
  className,
}: {
  size?: keyof typeof AVATAR_SIZE;
  className?: string;
}) {
  return (
    <span
      data-testid="skeleton-avatar"
      aria-hidden="true"
      className={[
        "app-skeleton rounded-full",
        AVATAR_SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function SkeletonButton({
  width = "1/3",
  className,
}: {
  width?: NonNullable<SkeletonProps["width"]>;
  className?: string;
}) {
  return (
    <Skeleton
      height="10"
      width={width}
      rounded="full"
      className={className}
    />
  );
}

type SkeletonCardProps = {
  children?: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

const CARD_PAD = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function SkeletonCard({
  children,
  className,
  padding = "md",
}: SkeletonCardProps) {
  return (
    <div
      data-testid="skeleton-card"
      className={[
        "rounded-2xl border border-border bg-surface shadow-sm",
        CARD_PAD[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children ?? (
        <div className="space-y-3">
          <Skeleton height="5" width="1/2" />
          <SkeletonText lines={3} />
        </div>
      )}
    </div>
  );
}
