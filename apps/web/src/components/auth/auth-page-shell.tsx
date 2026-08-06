import type { ReactNode } from "react";

/**
 * The sign-in surface.
 *
 * This was a bordered card floating on the canvas. Sign-in is the whole page —
 * there is nothing to separate it *from* — so the box was drawing a boundary
 * around the only thing present. It is now a centred column on the canvas,
 * which is how the landing page already reads.
 */
export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
