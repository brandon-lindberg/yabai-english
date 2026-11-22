import type { ReactNode } from "react";

const shapes = {
  language: <><path d="M4 5h12M10 3v2M6 5c0 6 4 10 8 12M14 5c0 6-4 10-10 13M14 21l4-10 4 10M15.5 17h5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18M7 14h2m3 0h2m3 0h1M7 17h2m3 0h2" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v2" /></>,
  trophy: <path d="M7 4h10v6a5 5 0 0 1-10 0V4Zm0 2H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 3v5m-4 0h8" />,
  graduationCap: <path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v5a9 9 0 0 0 12 0v-5m4-2v7" />,
} satisfies Record<string, ReactNode>;

export function InterfaceIcon({ name }: { name: keyof typeof shapes }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{shapes[name]}</svg>;
}
