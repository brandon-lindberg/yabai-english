"use client";

import { useEffect, useRef, useState } from "react";

export type ChatModerationMenuProps = {
  menuAriaLabel: string;
  blockLabel: string;
  unblockLabel: string;
  reportLabel: string;
  blockDisabled: boolean;
  unblockDisabled: boolean;
  reportDisabled: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
};

export function ChatModerationMenu({
  menuAriaLabel,
  blockLabel,
  unblockLabel,
  reportLabel,
  blockDisabled,
  unblockDisabled,
  reportDisabled,
  onBlock,
  onUnblock,
  onReport,
}: ChatModerationMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function runAction(fn: () => void) {
    setOpen(false);
    fn();
  }

  const itemClass =
    "flex w-full items-center px-3 py-2 text-left text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--app-hover)]";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={menuAriaLabel}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-0 bg-transparent p-1 text-base font-bold leading-none text-muted hover:text-foreground"
      >
        <span aria-hidden="true" className="inline-block min-w-[1.25rem] text-center tracking-tight">
          ...
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={blockDisabled}
            className={`${itemClass} text-red-700`}
            onClick={() => runAction(onBlock)}
          >
            {blockLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={unblockDisabled}
            className={`${itemClass} text-muted`}
            onClick={() => runAction(onUnblock)}
          >
            {unblockLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={reportDisabled}
            className={`${itemClass} text-red-700`}
            onClick={() => runAction(onReport)}
          >
            {reportLabel}
          </button>
        </div>
      )}
    </div>
  );
}
