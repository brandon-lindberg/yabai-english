import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function PlacementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const locale = await getLocale();
  const user = session?.user;
  if (!user) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }
  return children;
}
