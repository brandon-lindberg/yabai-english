import type { ReactNode } from "react";

const shapes: Record<"language" | "sun" | "moon" | "menu" | "chevron" | "check", ReactNode> = {
  language: <><path d="M4 5h12M10 3v2M6 5c0 6 4 10 8 12M14 5c0 6-4 10-10 13M14 21l4-10 4 10M15.5 17h5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  check: <path d="m5 12 4 4L19 6" />,
};

export function InterfaceIcon({ name }: { name: keyof typeof shapes }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{shapes[name]}</svg>;
}
