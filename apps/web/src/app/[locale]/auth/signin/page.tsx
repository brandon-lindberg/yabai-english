import { Suspense } from "react";
import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { redirect } from "@/i18n/navigation";
import { getAuthMode } from "@/lib/auth-mode";
import { getLocale } from "next-intl/server";

export default async function SignInPage() {
  const session = await auth();
  if (session) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  const { hasGoogleOAuth, devEmailSignIn } = getAuthMode();

  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-muted">…</div>}>
        <SignInForm hasGoogleOAuth={hasGoogleOAuth} devEmailSignIn={devEmailSignIn} />
      </Suspense>
    </main>
  );
}
