"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Labels = { label: string; pendingLabel: string };

export function GoogleSignInForm({ action, autoRetry = false, label, pendingLabel, children }: Labels & {
  action: (data: FormData) => Promise<void>;
  autoRetry?: boolean;
  children?: ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (autoRetry && !submitted.current) form.current?.requestSubmit();
  }, [autoRetry]);

  return (
    <form ref={form} action={action} onSubmit={() => { submitted.current = true; }}>
      {children}
      <GoogleSignInButton label={label} pendingLabel={pendingLabel} />
    </form>
  );
}

function GoogleSignInButton({ label, pendingLabel }: Labels) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] transition-colors hover:bg-[#f8f9fa] active:bg-[#edf0f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:cursor-wait motion-reduce:transition-none"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
        <path d="M21.35 11.1H12v2.98h5.36c-.23 1.5-1.8 4.4-5.36 4.4-3.23 0-5.86-2.67-5.86-5.97s2.63-5.97 5.86-5.97c1.84 0 3.07.79 3.78 1.47l2.58-2.5C16.72 3.98 14.56 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9 8.69-3.48 8.69-8.39c0-.56-.06-.99-.14-1.51z" fill="#4285F4" />
        <path d="M6.55 14.27 5.9 16.1 4.1 16.14A8.98 8.98 0 0 1 3 12c0-1.45.34-2.82.95-4.03h.01l1.6.29.7 1.58A5.41 5.41 0 0 0 6 12c0 .8.2 1.55.55 2.27z" fill="#34A853" />
        <path d="M12 21c-3.45 0-6.43-1.95-7.9-4.86l2.45-1.87a5.97 5.97 0 0 0 5.45 4.21c1.71 0 3.14-.58 4.19-1.58l2.6 2.03C17.2 20.24 14.76 21 12 21z" fill="#FBBC05" />
        <path d="M18.94 5.66 16.5 7.55A5.3 5.3 0 0 0 12 6.52c-2.63 0-4.84 1.78-5.65 4.12L3.95 7.2A8.98 8.98 0 0 1 12 3c2.63 0 4.81.96 6.94 2.66z" fill="#EA4335" />
      </svg>
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
