import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { redirect } from "@/i18n/navigation";
import { getAuthMode } from "@/lib/auth-mode";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import { getLocale } from "next-intl/server";

type Search = { callbackUrl?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (session) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  const { callbackUrl: rawCallback } = await searchParams;
  const safePostLoginPath = resolveSafeCallbackUrl(rawCallback, "/dashboard");

  const { hasGoogleOAuth, devEmailSignIn } = getAuthMode();

  return (
    <main className="flex flex-1 flex-col">
      <AuthPageShell>
        <SignInForm
          hasGoogleOAuth={hasGoogleOAuth}
          devEmailSignIn={devEmailSignIn}
          safePostLoginPath={safePostLoginPath}
        />
      </AuthPageShell>
    </main>
  );
}
