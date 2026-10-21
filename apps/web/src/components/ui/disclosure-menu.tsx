"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buttonClasses } from "./button";

/** Native disclosure with shared outside-press and keyboard dismissal. */
export function DisclosureMenu({ label, trigger, children, className = "", triggerClassName, panelClassName = "w-44" }: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details ref={ref} className={`relative ${className}`} onKeyDown={(event) => {
      if (event.key !== "Escape" || !ref.current?.open) return;
      event.preventDefault();
      event.stopPropagation();
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }} onClick={(event) => {
      if ((event.target as Element).closest("a,button[data-menu-close]") && ref.current) ref.current.open = false;
    }} onSubmit={() => { if (ref.current) ref.current.open = false; }}>
      <summary role="button" aria-label={label} title={label} className={`${triggerClassName ?? buttonClasses({ variant: "ghost", size: "icon", className: "cursor-pointer text-muted hover:text-foreground" })} list-none [&::-webkit-details-marker]:hidden`}>
        {trigger}
      </summary>
      <div className={`absolute right-0 top-full z-[60] mt-2 rounded-xl border border-border bg-surface p-2 ${panelClassName}`}>
        {children}
      </div>
    </details>
  );
}
