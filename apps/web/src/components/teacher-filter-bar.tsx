"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { authSignInHref } from "@/lib/auth-sign-in-href";

type Props = {
  specialty: string;
  language: string;
  /** When true, applying filters sends the user to sign-in with a callback URL instead of `router.replace`. */
  guestLocked?: boolean;
};

export function TeacherFilterBar({ specialty, language, guestLocked = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("booking");

  function update(next: { specialty?: string; language?: string }) {
    const params = new URLSearchParams();
    const s = (next.specialty ?? specialty).trim();
    const l = (next.language ?? language).trim().toUpperCase();
    if (s) params.set("specialty", s);
    if (l) params.set("language", l);
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;

    if (guestLocked) {
      if (!query) {
        router.replace(pathname);
        return;
      }
      router.push(authSignInHref(target) as "/auth/signin");
      return;
    }
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-2">
      {guestLocked ? (
        <p className="text-xs text-muted">{t("guestFilterHint")}</p>
      ) : null}
      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          Specialty
          <input
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            defaultValue={specialty}
            placeholder="conversation, business, exam..."
            onBlur={(e) => update({ specialty: e.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          Instruction language
          <input
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm uppercase text-foreground"
            defaultValue={language}
            placeholder="JP or EN"
            onBlur={(e) => update({ language: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
