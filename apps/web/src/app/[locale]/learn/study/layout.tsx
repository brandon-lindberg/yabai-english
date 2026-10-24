import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { requireAuth } from "@/lib/onboarding-gate";

export default async function StudyLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  await requireAuth(locale);
  return children;
}
