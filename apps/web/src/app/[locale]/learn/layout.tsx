import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const locale = await getLocale();
  if (!session) redirect({ href: "/", locale });
  return children;
}
