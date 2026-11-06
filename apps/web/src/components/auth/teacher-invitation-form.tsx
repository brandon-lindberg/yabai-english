"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { GoogleSignInForm } from "@/components/auth/google-sign-in-form";
import { Button } from "@/components/ui/button";

function subscribe(update: () => void) {
  window.addEventListener("hashchange", update);
  return () => window.removeEventListener("hashchange", update);
}

function InviteButtons({ canAccept }: { canAccept: boolean }) {
  const t = useTranslations("teacherInvitation");
  const { pending } = useFormStatus();
  return <div className="flex flex-wrap gap-2">
    {canAccept && <Button name="intent" value="accept" type="submit" disabled={pending}>{t("accept")}</Button>}
    <Button name="intent" value="switch" type="submit" variant="secondary" disabled={pending}>{t("switchAccount")}</Button>
  </div>;
}

export function TeacherInvitationForm({ action, account, canAccept, pendingLink }: {
  action: (data: FormData) => Promise<void>;
  account: string | null;
  canAccept: boolean;
  pendingLink: boolean;
}) {
  const authCopy = useTranslations("auth");
  const t = useTranslations("teacherInvitation");
  const token = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => null);
  if (!token && !pendingLink) return token === null ? null : <p className="text-sm text-muted">{t("openLink")}</p>;
  const secret = <input type="hidden" name="token" value={token ?? ""} />;
  if (!account) return <GoogleSignInForm action={action} label={authCopy("continueWithGoogle")} pendingLabel={authCopy("signingIn")}>{secret}</GoogleSignInForm>;
  return <form action={action} className="space-y-4">
    {secret}
    <p className="break-words text-sm text-muted">{t("account", { account })}</p>
    {!canAccept && <p className="text-sm text-muted">{t("ineligible")}</p>}
    <InviteButtons canAccept={canAccept} />
  </form>;
}
