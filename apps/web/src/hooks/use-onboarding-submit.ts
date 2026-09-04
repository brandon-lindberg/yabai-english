"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Save an onboarding step, then move on — or don't, and say why.
 *
 * The same fourteen lines were written three times: the student wizard's
 * submit, the teacher checklist's finish, and the teacher checklist's skip.
 * Each owned its own `saving` and `error` state and its own try/catch/finally.
 *
 * The rule worth having in one place is the one it is easiest to get wrong:
 * **a save that failed must not navigate.** Two of the three copies got this
 * right by returning early; a fourth copy would have been a coin toss.
 *
 * Returns whether the save landed, so a caller with its own cleanup to do —
 * discarding a saved draft, say — can tell success from failure.
 */
export function useOnboardingSubmit() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      url: string,
      { destination, init }: { destination: string; init?: RequestInit },
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(url, init ?? { method: "POST" });
        if (!res.ok) {
          setError(t("saveError"));
          return false;
        }
        router.push(destination);
        return true;
      } catch {
        setError(t("saveError"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [router, t],
  );

  return { saving, error, submit };
}
