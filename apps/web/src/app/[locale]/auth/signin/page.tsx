import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthMode } from "@/lib/auth-mode";

export default function SignInPage() {
  const { hasGoogleOAuth, devEmailSignIn } = getAuthMode();

  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-muted">…</div>}>
        <SignInForm hasGoogleOAuth={hasGoogleOAuth} devEmailSignIn={devEmailSignIn} />
      </Suspense>
    </main>
  );
}
