import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AuthPageShell({ children }: Props) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-[var(--app-canvas)] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-border bg-[var(--app-surface)] p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
