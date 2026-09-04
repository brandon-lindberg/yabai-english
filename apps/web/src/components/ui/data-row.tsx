import type { ReactNode } from "react";

/**
 * A ruled list row — the replacement for card-per-item lists.
 *
 * Lists of bookings, members, schools, rates and slots were each rendering one
 * bordered card per entry, which turns a list into a stack of trays: the eye
 * has to cross a border to reach every item and nothing scans down a column.
 * A shared rule between rows reads as one list.
 *
 * `DataList` owns the outer rule so the first row does not double it.
 */

export function DataList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={["list-none border-t border-border p-0", className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
}

type RowProps = {
  children: ReactNode;
  /** Trailing controls, right-aligned on wide screens and wrapped beneath on narrow. */
  actions?: ReactNode;
  /** Turns the whole row into a hover target when it is a link or button. */
  interactive?: boolean;
  /** Identifies the row to a delegated handler on an ancestor, e.g. the
   *  browse list's availability panel following the pointer. */
  dataId?: string;
  className?: string;
};

export function DataRow({
  children,
  actions,
  interactive = false,
  dataId,
  className = "",
}: RowProps) {
  return (
    <li
      data-row-id={dataId}
      className={[
        "border-b border-border py-4",
        /*
          `focus-within` as well as `hover`: what takes focus is a control
          inside the row, never the row itself, so a keyboard user would
          otherwise have no idea which row they were on.
        */
        interactive
          ? "transition-colors hover:bg-[var(--app-hover)] focus-within:bg-[var(--app-hover)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">{children}</div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </li>
  );
}
